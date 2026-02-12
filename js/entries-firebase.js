/**
 * ENTRIES MODULE - FIREBASE VERSION
 * With round-trip (aller-retour) distance calculation
 * And trajectory statistics for driver/truck performance
 */

import { DataModule } from './data-firebase.js';
import { TrajectoryStatsModule } from './trajectory-stats-firebase.js';
import { ClientsModule } from './clients-firebase.js';

function init() {
    document.getElementById('addEntryBtn')?.addEventListener('click', () => openModal());
    // Hide add button for chauffeur (read-only)
    if (window.currentUser?.driverId) {
        const addBtn = document.getElementById('addEntryBtn');
        if (addBtn) addBtn.style.display = 'none';
    }
}

async function refresh(selectedDate) {
    await renderEntries(selectedDate);
}

async function renderEntries(selectedDate) {
    let entries = DataModule.getEntriesByDate(selectedDate);
    // Chauffeur data scope: show only their entries
    const cu = window.currentUser;
    if (cu?.driverId) {
        entries = entries.filter(e => e.chauffeurId === cu.driverId);
    }
    const tbody = document.getElementById('entriesBody');
    if (!tbody) return;

    if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:#64748b;padding:40px;">Aucune saisie pour cette date.</td></tr>';
        return;
    }

    // Get clients for display
    const clients = await ClientsModule.getClients();

    tbody.innerHTML = entries.map(entry => {
        const truck = DataModule.getTruckById(entry.camionId);
        const driver = DataModule.getDriverById(entry.chauffeurId);
        const client = entry.clientId ? clients.find(c => c.id === entry.clientId) : null;
        const costs = DataModule.calculateEntryCosts(entry, truck);
        const resultClass = costs.resultat >= 0 ? 'result-positive' : 'result-negative';

        const origineShort = entry.origineDelegation || entry.origineGouvernorat || '-';
        const destShort = entry.delegation || entry.gouvernorat || entry.destination || '-';
        const trajetDisplay = `${origineShort} ↔ ${destShort}`;
        const trajetFull = `Aller: ${origineShort} → ${destShort}\nRetour: ${destShort} → ${origineShort}`;

        return `<tr>
            <td>${formatDate(entry.date)}</td>
            <td><strong>${client?.nom || '-'}</strong></td>
            <td>${truck?.matricule || '-'}</td>
            <td>${driver?.nom || '-'}</td>
            <td title="${trajetFull}">${trajetDisplay}</td>
            <td>${entry.kilometrage || 0} km</td>
            <td>${entry.quantiteGasoil || 0} L</td>
            <td>${costs.coutTotal.toLocaleString('fr-FR')} TND</td>
            <td>${entry.prixLivraison.toLocaleString('fr-FR')} TND</td>
            <td class="${resultClass}">${costs.resultat.toLocaleString('fr-FR')} TND</td>
            <td>
                ${!window.currentUser?.driverId ? `
                <button class="btn btn-sm btn-outline" onclick="EntriesModule.edit('${entry.id}')">✏️</button>
                <button class="btn btn-sm btn-outline" onclick="EntriesModule.remove('${entry.id}')">🗑️</button>
                ` : ''}
            </td>
        </tr>`;
    }).join('');
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function openModal(entryId = null) {
    const entries = await DataModule.getEntries();
    const entry = entryId ? entries.find(e => e.id === entryId) : null;
    const trucks = await DataModule.getTrucks();
    const drivers = await DataModule.getDrivers();
    const clients = await ClientsModule.getClients();
    const settings = await DataModule.getSettings();
    const title = entry ? 'Modifier Saisie' : 'Nouvelle Saisie Journalière';

    const selectedDate = document.getElementById('selectedDate')?.value || new Date().toISOString().split('T')[0];

    const truckOptions = trucks.map(t =>
        `<option value="${t.id}" ${entry?.camionId === t.id ? 'selected' : ''}>${t.matricule} (${t.type})</option>`
    ).join('');

    const driverOptions = drivers.map(d =>
        `<option value="${d.id}" ${entry?.chauffeurId === d.id ? 'selected' : ''}>${d.nom}</option>`
    ).join('');

    const clientOptions = clients.map(c =>
        `<option value="${c.id}" ${entry?.clientId === c.id ? 'selected' : ''}>${c.nom}</option>`
    ).join('');

    const gouvernorats = getGouvernorats();

    const origineGouvernoratOptions = gouvernorats.map(g =>
        `<option value="${g}" ${entry?.origineGouvernorat === g ? 'selected' : ''}>${g}</option>`
    ).join('');
    const origineDelegations = entry?.origineGouvernorat ? getDelegations(entry.origineGouvernorat) : [];
    const origineDelegationOptions = origineDelegations.map(d =>
        `<option value="${d}" ${entry?.origineDelegation === d ? 'selected' : ''}>${d}</option>`
    ).join('');

    const destGouvernoratOptions = gouvernorats.map(g =>
        `<option value="${g}" ${entry?.gouvernorat === g ? 'selected' : ''}>${g}</option>`
    ).join('');
    const destDelegations = entry?.gouvernorat ? getDelegations(entry.gouvernorat) : [];
    const destDelegationOptions = destDelegations.map(d =>
        `<option value="${d}" ${entry?.delegation === d ? 'selected' : ''}>${d}</option>`
    ).join('');

    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = `
        <form id="entryForm">
            <input type="hidden" id="entryId" value="${entry?.id || ''}">
            
            <div class="form-row">
                <div class="form-group">
                    <label for="entryDate">📅 Date</label>
                    <input type="date" id="entryDate" value="${entry?.date || selectedDate}" required>
                </div>
                <div class="form-group">
                    <label for="entryClient">👥 Client</label>
                    <select id="entryClient">
                        <option value="">-- Aucun client --</option>
                        ${clientOptions}
                    </select>
                </div>
            </div>

            <!-- Origin Section -->
            <div style="background: rgba(16, 185, 129, 0.1); border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #10b981;">
                <h4 style="margin-bottom: 12px; color: #10b981;">🚀 Point de Départ</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label for="origineGouvernorat">Gouvernorat</label>
                        <select id="origineGouvernorat" required onchange="EntriesModule.onOrigineGouvernoratChange()">
                            <option value="">-- Sélectionner --</option>
                            ${origineGouvernoratOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="origineDelegation">Délégation</label>
                        <select id="origineDelegation" required onchange="EntriesModule.updateDistanceEstimate()">
                            <option value="">-- Sélectionner gouvernorat --</option>
                            ${origineDelegationOptions}
                        </select>
                    </div>
                </div>
            </div>

            <!-- Destination Section -->
            <div style="background: rgba(239, 68, 68, 0.1); border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #ef4444;">
                <h4 style="margin-bottom: 12px; color: #ef4444;">📍 Destination</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label for="entryGouvernorat">Gouvernorat</label>
                        <select id="entryGouvernorat" required onchange="EntriesModule.onGouvernoratChange()">
                            <option value="">-- Sélectionner --</option>
                            ${destGouvernoratOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="entryDelegation">Délégation</label>
                        <select id="entryDelegation" required onchange="EntriesModule.updateDistanceEstimate()">
                            <option value="">-- Sélectionner gouvernorat --</option>
                            ${destDelegationOptions}
                        </select>
                    </div>
                </div>
            </div>

            <!-- Trajectory & Distance Display -->
            <div style="background: rgba(59, 130, 246, 0.1); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <div style="text-align: center; margin-bottom: 12px;">
                    <div id="trajectoryDisplay" style="color: #3b82f6; font-size: 1rem; margin-bottom: 8px;">
                        <span style="color: #10b981;">🚀 Départ</span> → 
                        <span style="color: #ef4444;">📍 Destination</span> → 
                        <span style="color: #10b981;">🚀 Retour</span>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; text-align: center;">
                    <div>
                        <span style="color: #64748b; font-size: 0.75rem;">Distance Aller</span>
                        <div id="distanceAller" style="color: #10b981; font-size: 1.25rem; font-weight: bold;">0 km</div>
                    </div>
                    <div>
                        <span style="color: #64748b; font-size: 0.75rem;">Distance Retour</span>
                        <div id="distanceRetour" style="color: #ef4444; font-size: 1.25rem; font-weight: bold;">0 km</div>
                    </div>
                    <div>
                        <span style="color: #64748b; font-size: 0.75rem;">Total Aller-Retour</span>
                        <div id="distanceTotal" style="color: #3b82f6; font-size: 1.5rem; font-weight: bold;">0 km</div>
                    </div>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="entryCamion">🚛 Camion</label>
                    <select id="entryCamion" required onchange="EntriesModule.onTruckChange()">
                        <option value="">-- Sélectionner --</option>
                        ${truckOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="entryChauffeur">👤 Chauffeur</label>
                    <select id="entryChauffeur" required>
                        <option value="">-- Sélectionner --</option>
                        ${driverOptions}
                    </select>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="entryKm">🛣️ Kilométrage Total (km)</label>
                    <input type="number" id="entryKm" value="${entry?.kilometrage || 0}" min="0" required>
                    <small style="color: #64748b;">Aller-retour calculé automatiquement</small>
                </div>
                <div class="form-group">
                    <label for="entryGasoil">⛽ Quantité Gasoil (L)</label>
                    <input type="number" id="entryGasoil" value="${entry?.quantiteGasoil || 0}" min="0" required onchange="EntriesModule.updateCalculations()">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="entryPrixGasoil">Prix Gasoil (TND/L)</label>
                    <input type="number" id="entryPrixGasoil" value="${entry?.prixGasoilLitre || settings.defaultFuelPrice}" min="0" step="0.1" required onchange="EntriesModule.updateCalculations()">
                </div>
                <div class="form-group">
                    <label for="entryMaintenance">🔧 Maintenance (TND)</label>
                    <input type="number" id="entryMaintenance" value="${entry?.maintenance || 0}" min="0" onchange="EntriesModule.updateCalculations()">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="entryPrixLivraison">💵 Prix Livraison (TND)</label>
                    <input type="number" id="entryPrixLivraison" value="${entry?.prixLivraison || 0}" min="0" required onchange="EntriesModule.updateCalculations()">
                </div>
                <div class="form-group">
                    <label for="entryRemarques">📝 Remarques</label>
                    <input type="text" id="entryRemarques" value="${entry?.remarques || ''}" placeholder="Ex: VIDANGE">
                </div>
            </div>

            <div style="background: rgba(139, 92, 246, 0.1); border-radius: 8px; padding: 16px; margin-top: 16px;">
                <h4 style="margin-bottom: 12px; color: #8b5cf6;">💰 Calculs Automatiques</h4>
                <div class="form-row">
                    <div class="form-group readonly">
                        <label>Montant Gasoil</label>
                        <input type="text" id="calcGasoil" value="0 TND" readonly>
                    </div>
                    <div class="form-group readonly">
                        <label>Coût Total</label>
                        <input type="text" id="calcCout" value="0 TND" readonly>
                    </div>
                </div>
                <div class="form-group readonly">
                    <label>Résultat (Livraison - Coût)</label>
                    <input type="text" id="calcResultat" value="0 TND" readonly style="font-weight: bold; font-size: 1.1rem;">
                </div>
            </div>

            <!-- Trajectory Statistics Panel -->
            <div id="trajectoryStatsContainer"></div>
        </form>
    `;

    document.getElementById('modalSave').onclick = saveEntry;
    App.showModal();
    setTimeout(() => {
        updateCalculations();
        updateTrajectoryStats();
    }, 100);
}

function onOrigineGouvernoratChange() {
    const gouvernorat = document.getElementById('origineGouvernorat').value;
    const delegationSelect = document.getElementById('origineDelegation');

    if (!gouvernorat) {
        delegationSelect.innerHTML = '<option value="">-- Sélectionner gouvernorat --</option>';
        return;
    }

    const delegations = getDelegations(gouvernorat);
    delegationSelect.innerHTML = '<option value="">-- Sélectionner --</option>' +
        delegations.map(d => `<option value="${d}">${d}</option>`).join('');

    updateDistanceEstimate();
}

function onGouvernoratChange() {
    const gouvernorat = document.getElementById('entryGouvernorat').value;
    const delegationSelect = document.getElementById('entryDelegation');

    if (!gouvernorat) {
        delegationSelect.innerHTML = '<option value="">-- Sélectionner gouvernorat --</option>';
        return;
    }

    const delegations = getDelegations(gouvernorat);
    delegationSelect.innerHTML = '<option value="">-- Sélectionner --</option>' +
        delegations.map(d => `<option value="${d}">${d}</option>`).join('');

    updateDistanceEstimate();
}

function updateDistanceEstimate() {
    const origineGouv = document.getElementById('origineGouvernorat')?.value;
    const origineDel = document.getElementById('origineDelegation')?.value;
    const destGouv = document.getElementById('entryGouvernorat')?.value;
    const destDel = document.getElementById('entryDelegation')?.value;

    if (origineGouv && destGouv) {
        const distanceAller = getDistanceEstimate(origineGouv, origineDel, destGouv, destDel);
        const distanceRetour = distanceAller;
        const distanceTotal = distanceAller * 2;

        const trajDisplay = document.getElementById('trajectoryDisplay');
        if (trajDisplay) {
            const origName = origineDel || origineGouv;
            const destName = destDel || destGouv;
            trajDisplay.innerHTML = `
                <span style="color: #10b981;">🚀 ${origName}</span> → 
                <span style="color: #ef4444;">📍 ${destName}</span> → 
                <span style="color: #10b981;">🏠 ${origName}</span>
            `;
        }

        const allerDisplay = document.getElementById('distanceAller');
        const retourDisplay = document.getElementById('distanceRetour');
        const totalDisplay = document.getElementById('distanceTotal');

        if (allerDisplay) allerDisplay.textContent = `${distanceAller} km`;
        if (retourDisplay) retourDisplay.textContent = `${distanceRetour} km`;
        if (totalDisplay) totalDisplay.textContent = `${distanceTotal} km`;

        const kmField = document.getElementById('entryKm');
        if (kmField) kmField.value = distanceTotal;

        // Update trajectory statistics for the new route
        updateTrajectoryStats();
    }
}

async function onTruckChange() {
    const truckId = document.getElementById('entryCamion').value;
    if (truckId) {
        const drivers = await DataModule.getDrivers();
        const driver = drivers.find(d => d.camionId === truckId);
        if (driver) {
            document.getElementById('entryChauffeur').value = driver.id;
        }
    }
    updateCalculations();
    updateTrajectoryStats(); // Update stats when truck changes
}

function updateCalculations() {
    const truckId = document.getElementById('entryCamion')?.value;
    const truck = truckId ? DataModule.getTruckById(truckId) : null;

    const gasoil = parseFloat(document.getElementById('entryGasoil')?.value) || 0;
    const prixGasoil = parseFloat(document.getElementById('entryPrixGasoil')?.value) || 0;
    const maintenance = parseFloat(document.getElementById('entryMaintenance')?.value) || 0;
    const prixLivraison = parseFloat(document.getElementById('entryPrixLivraison')?.value) || 0;

    const montantGasoil = gasoil * prixGasoil;
    let coutTotal = montantGasoil + maintenance;

    if (truck) {
        coutTotal += truck.chargesFixes + truck.montantAssurance + truck.montantTaxe + truck.chargePersonnel;
    }

    const resultat = prixLivraison - coutTotal;

    const calcGasoil = document.getElementById('calcGasoil');
    const calcCout = document.getElementById('calcCout');
    const calcResultat = document.getElementById('calcResultat');

    if (calcGasoil) calcGasoil.value = `${montantGasoil.toLocaleString('fr-FR')} TND`;
    if (calcCout) calcCout.value = `${coutTotal.toLocaleString('fr-FR')} TND`;
    if (calcResultat) {
        calcResultat.value = `${resultat.toLocaleString('fr-FR')} TND`;
        calcResultat.style.color = resultat >= 0 ? '#10b981' : '#ef4444';
    }
}

async function saveEntry() {
    const origineGouvernorat = document.getElementById('origineGouvernorat').value;
    const origineDelegation = document.getElementById('origineDelegation').value;
    const gouvernorat = document.getElementById('entryGouvernorat').value;
    const delegation = document.getElementById('entryDelegation').value;
    const distanceAller = getDistanceEstimate(origineGouvernorat, origineDelegation, gouvernorat, delegation);

    const entry = {
        id: document.getElementById('entryId').value || null,
        date: document.getElementById('entryDate').value,
        camionId: document.getElementById('entryCamion').value,
        chauffeurId: document.getElementById('entryChauffeur').value,
        clientId: document.getElementById('entryClient').value || null,
        origineGouvernorat,
        origineDelegation,
        origine: origineDelegation ? `${origineDelegation}, ${origineGouvernorat}` : origineGouvernorat,
        gouvernorat,
        delegation,
        destination: delegation ? `${delegation}, ${gouvernorat}` : gouvernorat,
        distanceAller,
        distanceRetour: distanceAller,
        kilometrage: parseFloat(document.getElementById('entryKm').value) || 0,
        quantiteGasoil: parseFloat(document.getElementById('entryGasoil').value) || 0,
        prixGasoilLitre: parseFloat(document.getElementById('entryPrixGasoil').value) || 2,
        maintenance: parseFloat(document.getElementById('entryMaintenance').value) || 0,
        prixLivraison: parseFloat(document.getElementById('entryPrixLivraison').value) || 0,
        remarques: document.getElementById('entryRemarques').value
    };

    if (!entry.date || !entry.camionId || !entry.chauffeurId || !entry.origineGouvernorat || !entry.gouvernorat) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
    }

    await DataModule.saveEntry(entry);
    App.hideModal();
    App.refreshCurrentPage();
}

function edit(id) { openModal(id); }

async function remove(id) {
    if (confirm('Supprimer cette saisie ?')) {
        await DataModule.deleteEntry(id);
        App.refreshCurrentPage();
    }
}

/**
 * Update trajectory statistics panel when driver/truck/route changes
 */
async function updateTrajectoryStats() {
    const container = document.getElementById('trajectoryStatsContainer');
    if (!container) return;

    const driverId = document.getElementById('entryChauffeur')?.value;
    const truckId = document.getElementById('entryCamion')?.value;
    const fromGouv = document.getElementById('origineGouvernorat')?.value;
    const fromDeleg = document.getElementById('origineDelegation')?.value;
    const toGouv = document.getElementById('entryGouvernorat')?.value;
    const toDeleg = document.getElementById('entryDelegation')?.value;

    // Need both origin and destination to show stats
    if (!fromGouv || !toGouv) {
        container.innerHTML = '';
        return;
    }

    // Show loading
    container.innerHTML = `
        <div style="text-align: center; padding: 12px; color: #64748b;">
            <span>⏳ Chargement des statistiques...</span>
        </div>
    `;

    try {
        const driverStats = driverId ?
            await TrajectoryStatsModule.getDriverTrajectoryStats(driverId, fromGouv, fromDeleg, toGouv, toDeleg) :
            { tripCount: 0 };

        const truckStats = truckId ?
            await TrajectoryStatsModule.getTruckTrajectoryStats(truckId, fromGouv, fromDeleg, toGouv, toDeleg) :
            { tripCount: 0 };

        container.innerHTML = TrajectoryStatsModule.renderTrajectoryStatsPanel(driverStats, truckStats);
    } catch (error) {
        console.error('Error loading trajectory stats:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 12px; color: #ef4444;">
                ❌ Erreur lors du chargement des statistiques
            </div>
        `;
    }
}

export const EntriesModule = {
    init,
    refresh,
    edit,
    remove,
    onTruckChange,
    onOrigineGouvernoratChange,
    onGouvernoratChange,
    updateCalculations,
    updateDistanceEstimate,
    updateTrajectoryStats
};

window.EntriesModule = EntriesModule;
