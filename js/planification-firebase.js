/**
 * PLANIFICATION MODULE - FIREBASE VERSION
 * With time, auto-status, terminé→entry conversion, and process type filters
 */

import { db, collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, COLLECTIONS } from './firebase.js';
import { DataModule } from './data-firebase.js';
import { ClientsModule } from './clients-firebase.js';

let cache = [];
let _loaded = false;
let _autoStatusInterval = null;

function init() {
    document.getElementById('addPlanBtn')?.addEventListener('click', () => openModal());
    document.getElementById('planFilterBtn')?.addEventListener('click', () => renderPlannings());
    console.log('📅 PlanificationModule initialized');
    // Hide add button for chauffeur (read-only)
    if (window.currentUser?.driverId) {
        const addBtn = document.getElementById('addPlanBtn');
        if (addBtn) addBtn.style.display = 'none';
    }
}

async function refresh(selectedDate) {
    await loadPlannings();
    await autoUpdateStatuses();
    await populateClientFilter();
    await renderPlannings(selectedDate);
    // Auto-check statuses every 60s
    if (_autoStatusInterval) clearInterval(_autoStatusInterval);
    _autoStatusInterval = setInterval(async () => {
        const changed = await autoUpdateStatuses();
        if (changed) await renderPlannings();
    }, 60000);
}

/** Populate client filter dropdown */
async function populateClientFilter() {
    const select = document.getElementById('planClientFilter');
    if (!select) return;
    const clients = await ClientsModule.getClients();
    select.innerHTML = '<option value="">Tous les clients</option>' +
        clients.map(c => `<option value="${c.id}">${c.nom}</option>`).join('');
}

/** Auto-update: planifié → en_cours when datetime has passed */
async function autoUpdateStatuses() {
    const now = new Date();
    let changed = false;
    for (const plan of cache) {
        if (plan.statut !== 'planifie') continue;
        const planDatetime = buildDatetime(plan.date, plan.heure);
        if (planDatetime && planDatetime <= now) {
            plan.statut = 'en_cours';
            plan.updatedAt = now.toISOString();
            try {
                await setDoc(doc(db, COLLECTIONS.planifications, plan.id), plan);
                console.log(`📅 Auto-status: ${plan.id} planifié → en_cours`);
                changed = true;
            } catch (err) {
                console.error('Auto-status update error:', err);
            }
        }
    }
    return changed;
}

function buildDatetime(dateStr, heureStr) {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    if (heureStr) {
        const [h, min] = heureStr.split(':').map(Number);
        return new Date(y, m - 1, d, h, min);
    }
    return new Date(y, m - 1, d, 0, 0);
}

async function loadPlannings() {
    try {
        const snap = await getDocs(collection(db, COLLECTIONS.planifications));
        cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        _loaded = true;
        return cache;
    } catch (error) {
        console.error('Error loading planifications:', error);
        return [];
    }
}

async function getPlannings() {
    if (!_loaded) await loadPlannings();
    return cache;
}

function getPlanningById(id) {
    return cache.find(p => p.id === id);
}

function getPlanningsByDate(dateStr) {
    return cache.filter(p => p.date === dateStr);
}

async function renderPlannings(selectedDate) {
    const tbody = document.getElementById('planningBody');
    if (!tbody) return;

    // Apply filters
    const filterDateStart = document.getElementById('planDateStart')?.value;
    const filterDateEnd = document.getElementById('planDateEnd')?.value;
    const filterClient = document.getElementById('planClientFilter')?.value;
    const filterStatus = document.getElementById('planStatusFilter')?.value;

    let plannings = [...cache].sort((a, b) => {
        // Sort by date+time desc
        const dtA = (a.date || '') + (a.heure || '00:00');
        const dtB = (b.date || '') + (b.heure || '00:00');
        return dtB.localeCompare(dtA);
    });

    // Chauffeur data scope
    const cu = window.currentUser;
    if (cu?.driverId) {
        plannings = plannings.filter(p => p.chauffeurId === cu.driverId);
    }

    // Apply filters
    if (filterDateStart) plannings = plannings.filter(p => p.date >= filterDateStart);
    if (filterDateEnd) plannings = plannings.filter(p => p.date <= filterDateEnd);
    if (filterClient) plannings = plannings.filter(p => p.clientId === filterClient);
    if (filterStatus) plannings = plannings.filter(p => p.statut === filterStatus);

    // Stats
    const statsEl = document.getElementById('planningStats');
    if (statsEl) {
        const total = plannings.length;
        const planifie = plannings.filter(p => p.statut === 'planifie').length;
        const enCours = plannings.filter(p => p.statut === 'en_cours').length;
        const termine = plannings.filter(p => p.statut === 'termine').length;
        statsEl.innerHTML = `<span>📊 ${total} total</span> <span style="color:#f59e0b">📅 ${planifie} planifié</span> <span style="color:#3b82f6">🚚 ${enCours} en cours</span> <span style="color:#10b981">✅ ${termine} terminé</span>`;
    }

    if (plannings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;color:#64748b;padding:40px;">Aucune planification trouvée.</td></tr>';
        return;
    }

    const clients = await ClientsModule.getClients();
    const trucks = await DataModule.getTrucks();
    const drivers = await DataModule.getDrivers();

    tbody.innerHTML = plannings.map(plan => {
        const client = plan.clientId ? clients.find(c => c.id === plan.clientId) : null;
        const truck = plan.camionId ? trucks.find(t => t.id === plan.camionId) : null;
        const driver = plan.chauffeurId ? drivers.find(d => d.id === plan.chauffeurId) : null;

        const origineShort = plan.origineDelegation || plan.origineGouvernorat || '-';
        const destShort = client
            ? `${client.nom} (${plan.delegation || plan.gouvernorat || ''})`
            : (plan.delegation || plan.gouvernorat || '-');
        const trajetDisplay = `${origineShort} ↔ ${destShort}`;

        const statusClass = {
            'planifie': 'status-warning',
            'en_cours': 'status-info',
            'termine': 'status-success',
            'annule': 'status-danger'
        }[plan.statut] || 'status-default';

        const statusLabel = {
            'planifie': 'Planifié',
            'en_cours': 'En cours',
            'termine': 'Terminé',
            'annule': 'Annulé'
        }[plan.statut] || plan.statut || 'Planifié';

        const truckCharges = truck ? ((truck.chargesFixes || 0) + (truck.montantAssurance || 0) + (truck.montantTaxe || 0) + (truck.chargePersonnel || 0) + (truck.fraisLeasing || 0)) : 0;
        const coutTotal = (plan.montantGasoil || 0) + (plan.maintenance || 0) + truckCharges;
        const resultat = (plan.prixLivraison || 0) - coutTotal;
        const resultClass = resultat >= 0 ? 'result-positive' : 'result-negative';

        const heureDisplay = plan.heure ? ` <span style="color:#8b5cf6;font-weight:600">${plan.heure}</span>` : '';

        return `<tr>
            <td>${formatDate(plan.date)}${heureDisplay}</td>
            <td><strong>${client?.nom || '-'}</strong></td>
            <td>${truck?.matricule || '-'}</td>
            <td>${driver?.nom || '-'}</td>
            <td>${trajetDisplay}</td>
            <td>${plan.kilometrage || 0} km</td>
            <td>${plan.quantiteGasoil || 0} L</td>
            <td>${coutTotal.toLocaleString('fr-FR')} TND</td>
            <td>${(plan.prixLivraison || 0).toLocaleString('fr-FR')} TND</td>
            <td class="${resultClass}">${resultat.toLocaleString('fr-FR')} TND</td>
            <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
            <td>
                ${!window.currentUser?.driverId ? `
                <button class="btn btn-sm btn-outline" onclick="PlanificationModule.edit('${plan.id}')" title="Modifier">✏️</button>
                <button class="btn btn-sm btn-outline" onclick="PlanificationModule.remove('${plan.id}')" title="Supprimer">🗑️</button>
                ` : ''}
            </td>
        </tr>`;
    }).join('');
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(heure) {
    return heure || '';
}

// ==================== MODAL ====================
async function openModal(planId = null) {
    await loadPlannings();
    const plan = planId ? getPlanningById(planId) : null;
    const trucks = await DataModule.getTrucks();
    const drivers = await DataModule.getDrivers();
    const clients = await ClientsModule.getClients();
    const settings = await DataModule.getSettings();
    const title = plan ? 'Modifier Planification' : 'Nouvelle Planification';

    const selectedDate = document.getElementById('selectedDate')?.value || new Date().toISOString().split('T')[0];

    const truckOptions = trucks.map(t =>
        `<option value="${t.id}" ${plan?.camionId === t.id ? 'selected' : ''}>${t.matricule} (${t.type || ''})</option>`
    ).join('');

    const driverOptions = drivers.map(d =>
        `<option value="${d.id}" ${plan?.chauffeurId === d.id ? 'selected' : ''}>${d.nom}</option>`
    ).join('');

    const clientOptions = clients.map(c =>
        `<option value="${c.id}" ${plan?.clientId === c.id ? 'selected' : ''}>${c.nom}</option>`
    ).join('');

    const gouvernorats = getGouvernorats();

    const origineGouvernoratOptions = gouvernorats.map(g =>
        `<option value="${g}" ${plan?.origineGouvernorat === g ? 'selected' : ''}>${g}</option>`
    ).join('');
    const origineDelegations = plan?.origineGouvernorat ? getDelegations(plan.origineGouvernorat) : [];
    const origineDelegationOptions = origineDelegations.map(d =>
        `<option value="${d}" ${plan?.origineDelegation === d ? 'selected' : ''}>${d}</option>`
    ).join('');

    const destGouvernoratOptions = gouvernorats.map(g =>
        `<option value="${g}" ${plan?.gouvernorat === g ? 'selected' : ''}>${g}</option>`
    ).join('');
    const destDelegations = plan?.gouvernorat ? getDelegations(plan.gouvernorat) : [];
    const destDelegationOptions = destDelegations.map(d =>
        `<option value="${d}" ${plan?.delegation === d ? 'selected' : ''}>${d}</option>`
    ).join('');

    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = `
        <form id="planForm">
            <input type="hidden" id="planId" value="${plan?.id || ''}">
            
            <div class="form-row">
                <div class="form-group">
                    <label for="planDate">📅 Date</label>
                    <input type="date" id="planDate" value="${plan?.date || selectedDate}" required>
                </div>
                <div class="form-group">
                    <label for="planHeure">🕐 Heure</label>
                    <input type="time" id="planHeure" value="${plan?.heure || '08:00'}">
                </div>
                <div class="form-group">
                    <label for="planStatut">📊 Statut</label>
                    <select id="planStatut">
                        <option value="planifie" ${plan?.statut === 'planifie' ? 'selected' : ''}>📅 Planifié</option>
                        <option value="en_cours" ${plan?.statut === 'en_cours' ? 'selected' : ''}>🚚 En cours</option>
                        <option value="termine" ${plan?.statut === 'termine' ? 'selected' : ''}>✅ Terminé</option>
                        <option value="annule" ${plan?.statut === 'annule' ? 'selected' : ''}>❌ Annulé</option>
                    </select>
                </div>
            </div>

            <!-- Origin Section -->
            <div style="background: rgba(16, 185, 129, 0.1); border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #10b981;">
                <h4 style="margin-bottom: 12px; color: #10b981;">🚀 Point de Départ</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label for="planOrigineGouvernorat">Gouvernorat</label>
                        <select id="planOrigineGouvernorat" required onchange="PlanificationModule.onOrigineGouvernoratChange()">
                            <option value="">-- Sélectionner --</option>
                            ${origineGouvernoratOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="planOrigineDelegation">Délégation</label>
                        <select id="planOrigineDelegation" required onchange="PlanificationModule.updateDistanceEstimate()">
                            <option value="">-- Sélectionner gouvernorat --</option>
                            ${origineDelegationOptions}
                        </select>
                    </div>
                </div>
            </div>

            <!-- Destination Section -->
            <div style="background: rgba(239, 68, 68, 0.1); border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #ef4444;">
                <h4 style="margin-bottom: 12px; color: #ef4444;">📍 Destination</h4>
                <div class="form-group" style="margin-bottom:12px">
                    <label for="planClient">👥 Client</label>
                    <select id="planClient" onchange="PlanificationModule.onClientChangeDestination()">
                        <option value="">-- Aucun client --</option>
                        ${clientOptions}
                    </select>
                    <div id="planClientLocInfo" style="font-size:12px;margin-top:6px"></div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="planGouvernorat">Gouvernorat *</label>
                        <select id="planGouvernorat" required onchange="PlanificationModule.onGouvernoratChange()">
                            <option value="">-- Sélectionner --</option>
                            ${destGouvernoratOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="planDelegation">Délégation *</label>
                        <select id="planDelegation" required onchange="PlanificationModule.updateDistanceEstimate()">
                            <option value="">-- Sélectionner gouvernorat --</option>
                            ${destDelegationOptions}
                        </select>
                    </div>
                </div>
            </div>

            <!-- Trajectory & Distance Display -->
            <div style="background: rgba(59, 130, 246, 0.1); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <div style="text-align: center; margin-bottom: 12px;">
                    <div id="planTrajectoryDisplay" style="color: #3b82f6; font-size: 1rem; margin-bottom: 8px;">
                        <span style="color: #10b981;">🚀 Départ</span> → 
                        <span style="color: #ef4444;">📍 Destination</span> → 
                        <span style="color: #10b981;">🚀 Retour</span>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; text-align: center;">
                    <div>
                        <span style="color: #64748b; font-size: 0.75rem;">Distance Aller</span>
                        <div id="planDistanceAller" style="color: #10b981; font-size: 1.25rem; font-weight: bold;">0 km</div>
                    </div>
                    <div>
                        <span style="color: #64748b; font-size: 0.75rem;">Distance Retour</span>
                        <div id="planDistanceRetour" style="color: #ef4444; font-size: 1.25rem; font-weight: bold;">0 km</div>
                    </div>
                    <div>
                        <span style="color: #64748b; font-size: 0.75rem;">Total Aller-Retour</span>
                        <div id="planDistanceTotal" style="color: #3b82f6; font-size: 1.5rem; font-weight: bold;">0 km</div>
                    </div>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="planCamion">🚛 Camion</label>
                    <select id="planCamion" onchange="PlanificationModule.onTruckChange()">
                        <option value="">-- Sélectionner --</option>
                        ${truckOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="planChauffeur">👤 Chauffeur</label>
                    <select id="planChauffeur">
                        <option value="">-- Sélectionner --</option>
                        ${driverOptions}
                    </select>
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="planKm">🛣️ Kilométrage Estimé (km)</label>
                    <input type="number" id="planKm" value="${plan?.kilometrage || 0}" min="0">
                    <small style="color: #64748b;">Aller-retour calculé automatiquement</small>
                </div>
                <div class="form-group">
                    <label for="planGasoil">⛽ Quantité Gasoil Estimée (L)</label>
                    <input type="number" id="planGasoil" value="${plan?.quantiteGasoil || 0}" min="0" onchange="PlanificationModule.updateCalculations()">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="planPrixGasoil">Prix Gasoil (TND/L)</label>
                    <input type="number" id="planPrixGasoil" value="${plan?.prixGasoilLitre || settings?.defaultFuelPrice || 2}" min="0" step="0.1" onchange="PlanificationModule.updateCalculations()">
                </div>
                <div class="form-group">
                    <label for="planMaintenance">🔧 Maintenance (TND)</label>
                    <input type="number" id="planMaintenance" value="${plan?.maintenance || 0}" min="0" onchange="PlanificationModule.updateCalculations()">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="planPrixLivraison">💵 Prix Livraison Estimé (TND)</label>
                    <input type="number" id="planPrixLivraison" value="${plan?.prixLivraison || 0}" min="0" onchange="PlanificationModule.updateCalculations()">
                </div>
                <div class="form-group">
                    <label for="planRemarques">📝 Remarques</label>
                    <input type="text" id="planRemarques" value="${plan?.remarques || ''}" placeholder="Notes, instructions...">
                </div>
            </div>

            <div style="background: rgba(139, 92, 246, 0.1); border-radius: 8px; padding: 16px; margin-top: 16px;">
                <h4 style="margin-bottom: 12px; color: #8b5cf6;">💰 Estimations Automatiques</h4>
                <div class="form-row">
                    <div class="form-group readonly">
                        <label>Montant Gasoil</label>
                        <input type="text" id="planCalcGasoil" value="0 TND" readonly>
                    </div>
                    <div class="form-group readonly">
                        <label>Coût Total Estimé</label>
                        <input type="text" id="planCalcCout" value="0 TND" readonly>
                    </div>
                </div>
                <div class="form-group readonly">
                    <label>Résultat Estimé (Livraison - Coût)</label>
                    <input type="text" id="planCalcResultat" value="0 TND" readonly style="font-weight: bold; font-size: 1.1rem;">
                </div>
            </div>
        </form>
    `;

    document.getElementById('modalSave').onclick = savePlan;
    App.showModal();

    // Initialize calculations
    updateDistanceEstimate();
    updateCalculations();
}

// ==================== DELEGATION CHANGES ====================
function onOrigineGouvernoratChange() {
    const gouvernorat = document.getElementById('planOrigineGouvernorat').value;
    const delegationSelect = document.getElementById('planOrigineDelegation');

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
    const gouvernorat = document.getElementById('planGouvernorat').value;
    const delegationSelect = document.getElementById('planDelegation');

    if (!gouvernorat) {
        delegationSelect.innerHTML = '<option value="">-- Sélectionner gouvernorat --</option>';
        return;
    }

    const delegations = getDelegations(gouvernorat);
    delegationSelect.innerHTML = '<option value="">-- Sélectionner --</option>' +
        delegations.map(d => `<option value="${d}">${d}</option>`).join('');

    updateDistanceEstimate();
}

async function onClientChangeDestination() {
    const clientId = document.getElementById('planClient')?.value;
    const infoDiv = document.getElementById('planClientLocInfo');
    if (!clientId) {
        if (infoDiv) infoDiv.innerHTML = '';
        return;
    }
    const client = ClientsModule.getClientById(clientId);
    if (!client) return;

    // Show client info + button to use client's default location
    if (infoDiv) {
        const hasLoc = client.gouvernorat;
        const loc = client.delegation ? `${client.delegation}, ${client.gouvernorat}` : (client.gouvernorat || 'Non définie');
        infoDiv.innerHTML = hasLoc
            ? `<span style="color:#64748b">📍 Localisation: <strong>${loc}</strong></span>
               <button type="button" onclick="PlanificationModule.useClientLocation()" style="margin-left:8px;padding:3px 10px;border-radius:4px;border:1px solid #3b82f6;background:#3b82f6;color:#fff;font-size:12px;cursor:pointer">Utiliser cette localisation</button>`
            : `<span style="color:#94a3b8">📍 Aucune localisation par défaut pour ce client</span>`;
    }
}

function useClientLocation() {
    const clientId = document.getElementById('planClient')?.value;
    if (!clientId) return;
    const client = ClientsModule.getClientById(clientId);
    if (!client?.gouvernorat) return;

    const gouvSel = document.getElementById('planGouvernorat');
    if (gouvSel) { gouvSel.value = client.gouvernorat; onGouvernoratChange(); }
    setTimeout(() => {
        if (client.delegation) {
            const delSel = document.getElementById('planDelegation');
            if (delSel) delSel.value = client.delegation;
        }
        updateDistanceEstimate();
        // Update info to show it was applied
        const infoDiv = document.getElementById('planClientLocInfo');
        if (infoDiv) {
            const loc = client.delegation ? `${client.delegation}, ${client.gouvernorat}` : client.gouvernorat;
            infoDiv.innerHTML = `<span style="color:#10b981">✅ Localisation appliquée: <strong>${loc}</strong></span>`;
        }
    }, 50);
}

function updateDistanceEstimate() {
    const origineGouv = document.getElementById('planOrigineGouvernorat')?.value;
    const origineDel = document.getElementById('planOrigineDelegation')?.value;
    const destGouv = document.getElementById('planGouvernorat')?.value || '';
    const destDel = document.getElementById('planDelegation')?.value || '';

    const destName = destDel || destGouv;

    if (origineGouv && destGouv) {
        const distanceAller = getDistanceEstimate(origineGouv, origineDel, destGouv, destDel);
        const distanceRetour = distanceAller;
        const distanceTotal = distanceAller * 2;

        const origName = origineDel || origineGouv;
        const trajDisplay = document.getElementById('planTrajectoryDisplay');
        if (trajDisplay) {
            trajDisplay.innerHTML = `
                <span style="color: #10b981;">🚀 ${origName}</span> → 
                <span style="color: #ef4444;">📍 ${destName}</span> → 
                <span style="color: #10b981;">🏠 ${origName}</span>
            `;
        }

        const allerDisplay = document.getElementById('planDistanceAller');
        const retourDisplay = document.getElementById('planDistanceRetour');
        const totalDisplay = document.getElementById('planDistanceTotal');
        const kmInput = document.getElementById('planKm');

        if (allerDisplay) allerDisplay.textContent = `${distanceAller} km`;
        if (retourDisplay) retourDisplay.textContent = `${distanceRetour} km`;
        if (totalDisplay) totalDisplay.textContent = `${distanceTotal} km`;
        if (kmInput && (!kmInput.value || kmInput.value === '0')) {
            kmInput.value = distanceTotal;
        }
    }
}

async function onTruckChange() {
    const truckId = document.getElementById('planCamion').value;
    if (truckId) {
        const drivers = await DataModule.getDrivers();
        const driver = drivers.find(d => d.camionId === truckId);
        if (driver) {
            document.getElementById('planChauffeur').value = driver.id;
        }
    }
    updateCalculations();
}

function updateCalculations() {
    const truckId = document.getElementById('planCamion')?.value;
    const truck = truckId ? DataModule.getTruckById(truckId) : null;

    const gasoil = parseFloat(document.getElementById('planGasoil')?.value) || 0;
    const prixGasoil = parseFloat(document.getElementById('planPrixGasoil')?.value) || 0;
    const maintenance = parseFloat(document.getElementById('planMaintenance')?.value) || 0;
    const prixLivraison = parseFloat(document.getElementById('planPrixLivraison')?.value) || 0;

    const montantGasoil = gasoil * prixGasoil;
    let coutTotal = montantGasoil + maintenance;

    if (truck) {
        coutTotal += (truck.chargesFixes || 0) + (truck.montantAssurance || 0) + (truck.montantTaxe || 0) + (truck.chargePersonnel || 0) + (truck.fraisLeasing || 0);
    }

    const resultat = prixLivraison - coutTotal;

    const calcGasoil = document.getElementById('planCalcGasoil');
    const calcCout = document.getElementById('planCalcCout');
    const calcResultat = document.getElementById('planCalcResultat');

    if (calcGasoil) calcGasoil.value = `${montantGasoil.toLocaleString('fr-FR')} TND`;
    if (calcCout) calcCout.value = `${coutTotal.toLocaleString('fr-FR')} TND`;
    if (calcResultat) {
        calcResultat.value = `${resultat.toLocaleString('fr-FR')} TND`;
        calcResultat.style.color = resultat >= 0 ? '#10b981' : '#ef4444';
    }
}

// ==================== SAVE ====================
async function savePlan() {
    const origineGouvernorat = document.getElementById('planOrigineGouvernorat').value;
    const origineDelegation = document.getElementById('planOrigineDelegation').value;
    const gouvernorat = document.getElementById('planGouvernorat').value;
    const delegation = document.getElementById('planDelegation').value;
    const clientId = document.getElementById('planClient')?.value || '';

    // Calculate distance from gouvernorat/delegation
    const distanceAller = getDistanceEstimate(origineGouvernorat, origineDelegation, gouvernorat, delegation);
    const destLabel = delegation ? `${delegation}, ${gouvernorat}` : gouvernorat;
    const gasoil = parseFloat(document.getElementById('planGasoil')?.value) || 0;
    const prixGasoil = parseFloat(document.getElementById('planPrixGasoil')?.value) || 0;
    const montantGasoil = gasoil * prixGasoil;

    const planId = document.getElementById('planId').value;
    const newStatut = document.getElementById('planStatut').value || 'planifie';

    // Detect status transition: check previous status
    const existingPlan = planId ? getPlanningById(planId) : null;
    const previousStatut = existingPlan?.statut;
    const isNewTermine = (newStatut === 'termine' && previousStatut !== 'termine');

    const plan = {
        id: planId || `plan_${Date.now()}`,
        date: document.getElementById('planDate').value,
        heure: document.getElementById('planHeure')?.value || '',
        clientId: clientId,
        statut: newStatut,
        camionId: document.getElementById('planCamion').value,
        chauffeurId: document.getElementById('planChauffeur').value,
        origineGouvernorat,
        origineDelegation,
        origine: origineDelegation ? `${origineDelegation}, ${origineGouvernorat}` : origineGouvernorat,
        gouvernorat,
        delegation,
        destination: destLabel,
        kilometrage: parseInt(document.getElementById('planKm').value) || distanceAller * 2,
        distanceAller,
        quantiteGasoil: gasoil,
        prixGasoilLitre: prixGasoil,
        montantGasoil,
        maintenance: parseFloat(document.getElementById('planMaintenance').value) || 0,
        prixLivraison: parseFloat(document.getElementById('planPrixLivraison').value) || 0,
        remarques: document.getElementById('planRemarques').value,
        updatedAt: new Date().toISOString()
    };

    if (!plan.date || !gouvernorat) {
        alert('La date et le gouvernorat de destination sont obligatoires');
        return;
    }

    try {
        if (isNewTermine) {
            // Convert to saisie journalière then DELETE from planification
            await convertToEntry(plan);
            await deleteDoc(doc(db, COLLECTIONS.planifications, plan.id));
            console.log(`🗑️ Planification ${plan.id} supprimée après conversion`);
        } else {
            await setDoc(doc(db, COLLECTIONS.planifications, plan.id), plan);
        }

        App.hideModal();
        await loadPlannings();
        await renderPlannings();
    } catch (error) {
        console.error('Error saving plan:', error);
        alert('Erreur lors de l\'enregistrement: ' + error.message);
    }
}

/** Convert a terminé planification into a saisie journalière (entry) */
async function convertToEntry(plan) {
    const entry = {
        date: plan.date,
        camionId: plan.camionId,
        chauffeurId: plan.chauffeurId,
        clientId: plan.clientId || null,
        origineGouvernorat: plan.origineGouvernorat,
        origineDelegation: plan.origineDelegation,
        origine: plan.origine,
        gouvernorat: plan.gouvernorat,
        delegation: plan.delegation,
        destination: plan.destination,
        distanceAller: plan.distanceAller,
        distanceRetour: plan.distanceAller,
        kilometrage: plan.kilometrage || 0,
        quantiteGasoil: plan.quantiteGasoil || 0,
        prixGasoilLitre: plan.prixGasoilLitre || 0,
        maintenance: plan.maintenance || 0,
        prixLivraison: plan.prixLivraison || 0,
        remarques: (plan.remarques || '') + ` [Plan ${plan.id}]`,
        source: 'planification',
        planificationId: plan.id
    };

    try {
        await DataModule.saveEntry(entry);
        console.log(`✅ Planification ${plan.id} → saisie journalière créée`);
        // Notify user
        const msg = `✅ La planification a été transformée en saisie journalière (${plan.date})`;
        if (typeof App !== 'undefined' && App.showToast) {
            App.showToast(msg);
        } else {
            alert(msg);
        }
    } catch (err) {
        console.error('Error converting planification to entry:', err);
        alert('⚠️ Planification sauvegardée mais erreur lors de la conversion en saisie: ' + err.message);
    }
}

// ==================== EDIT & DELETE ====================
function edit(id) {
    openModal(id);
}

async function remove(id) {
    if (confirm('Supprimer cette planification ?')) {
        try {
            await deleteDoc(doc(db, COLLECTIONS.planifications, id));
            await loadPlannings();
            await renderPlannings();
        } catch (error) {
            console.error('Error deleting plan:', error);
        }
    }
}

// ==================== EXPORT ====================
export const PlanificationModule = {
    init,
    refresh,
    getPlannings,
    getPlanningById,
    edit,
    remove,
    onOrigineGouvernoratChange,
    onGouvernoratChange,
    updateDistanceEstimate,
    onTruckChange,
    updateCalculations,
    convertToEntry,
    onClientChangeDestination,
    useClientLocation
};

window.PlanificationModule = PlanificationModule;
