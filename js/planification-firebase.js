/**
 * PLANIFICATION MODULE - FIREBASE VERSION
 * Copie exacte de Saisie Journalière avec Client + Statut
 */

import { db, collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, COLLECTIONS } from './firebase.js';
import { DataModule } from './data-firebase.js';
import { ClientsModule } from './clients-firebase.js';

let cache = [];

function init() {
    document.getElementById('addPlanBtn')?.addEventListener('click', () => openModal());
    console.log('📅 PlanificationModule initialized');
}

async function refresh(selectedDate) {
    await loadPlannings();
    await renderPlannings(selectedDate);
}

async function loadPlannings() {
    try {
        const snap = await getDocs(collection(db, COLLECTIONS.planifications));
        cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return cache;
    } catch (error) {
        console.error('Error loading planifications:', error);
        return [];
    }
}

async function getPlannings() {
    if (cache.length === 0) await loadPlannings();
    return cache;
}

function getPlanningById(id) {
    return cache.find(p => p.id === id);
}

function getPlanningsByDate(dateStr) {
    return cache.filter(p => p.date === dateStr);
}

async function renderPlannings(selectedDate) {
    const dateToShow = selectedDate || document.getElementById('selectedDate')?.value || new Date().toISOString().split('T')[0];
    const plannings = getPlanningsByDate(dateToShow);
    const tbody = document.getElementById('planningBody');
    if (!tbody) return;

    if (plannings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:#64748b;padding:40px;">Aucune planification pour cette date.</td></tr>';
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
        const destShort = plan.delegation || plan.gouvernorat || '-';
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

        const coutTotal = (plan.montantGasoil || 0) + (plan.maintenance || 0);
        const resultat = (plan.prixLivraison || 0) - coutTotal;
        const resultClass = resultat >= 0 ? 'result-positive' : 'result-negative';

        return `<tr>
            <td>${formatDate(plan.date)}</td>
            <td><strong>${client?.nom || '-'}</strong></td>
            <td>${truck?.matricule || '-'}</td>
            <td>${driver?.nom || '-'}</td>
            <td>${trajetDisplay}</td>
            <td>${plan.kilometrage || 0} km</td>
            <td>${plan.quantiteGasoil || 0} L</td>
            <td>${coutTotal.toLocaleString('fr-FR')} TND</td>
            <td>${(plan.prixLivraison || 0).toLocaleString('fr-FR')} TND</td>
            <td class="${resultClass}">${resultat.toLocaleString('fr-FR')} TND</td>
            <td>
                <span class="status-badge ${statusClass}">${statusLabel}</span>
                <button class="btn btn-sm btn-outline" onclick="PlanificationModule.edit('${plan.id}')">✏️</button>
                <button class="btn btn-sm btn-outline" onclick="PlanificationModule.remove('${plan.id}')">🗑️</button>
            </td>
        </tr>`;
    }).join('');
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ==================== GOUVERNORATS & DELEGATIONS ====================
function getGouvernorats() {
    return [
        'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba',
        'Kairouan', 'Kasserine', 'Kébili', 'Le Kef', 'Mahdia', 'La Manouba',
        'Médenine', 'Monastir', 'Nabeul', 'Sfax', 'Sidi Bouzid', 'Siliana',
        'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan'
    ];
}

function getDelegations(gouvernorat) {
    const delegationsMap = {
        'Gabès': ['Gabès Médina', 'Gabès Ouest', 'Gabès Sud', 'Ghanouch', 'Métouia', 'El Hamma', 'Matmata', 'Matmata Nouvelle', 'Mareth', 'Menzel El Habib'],
        'Tunis': ['Tunis', 'Le Bardo', 'La Marsa', 'Carthage', 'Sidi Bou Said', 'La Goulette', 'Le Kram', 'Médina', 'Bab El Bhar', 'Bab Souika', 'Cité El Khadra', 'El Omrane', 'El Omrane Supérieur', 'Ettahrir', 'El Menzah', 'El Ouardia', 'Séjoumi', 'Ezzouhour', 'El Hrairia', 'Sidi El Béchir', 'Djebel Jelloud'],
        'Sfax': ['Sfax Ville', 'Sfax Ouest', 'Sfax Sud', 'Sakiet Eddaïer', 'Sakiet Ezzit', 'El Aïn', 'Thyna', 'Agareb', 'Djebiniana', 'El Hencha', 'Menzel Chaker', 'Ghraïba', 'Bir Ali Ben Khélifa', 'Skhira', 'Mahares', 'Kerkennah'],
        'Sousse': ['Sousse Ville', 'Sousse Jawhara', 'Sousse Riadh', 'Sousse Sidi Abdelhamid', 'Hammam Sousse', 'Akouda', 'Kalâa Kebira', 'Sidi Bou Ali', 'Hergla', 'Enfidha', 'Bouficha', 'Kondar', 'Sidi El Héni', 'M\'saken', 'Kalâa Seghira', 'Zaouia-Ksiba-Thrayet'],
        'Médenine': ['Médenine Nord', 'Médenine Sud', 'Ben Guerdane', 'Zarzis', 'Djerba Houmt Souk', 'Djerba Midoun', 'Djerba Ajim', 'Béni Khedache', 'Sidi Makhlouf'],
        'Kébili': ['Kébili Nord', 'Kébili Sud', 'Douz Nord', 'Douz Sud', 'Souk Lahad', 'Faouar'],
        'Gafsa': ['Gafsa Nord', 'Gafsa Sud', 'Sidi Aïch', 'El Ksar', 'Oum El Araïes', 'Redeyef', 'Métlaoui', 'M\'dhilla', 'El Guettar', 'Belkhir', 'Sned'],
        'Tataouine': ['Tataouine Nord', 'Tataouine Sud', 'Smâr', 'Bir Lahmar', 'Ghomrassen', 'Dhehiba', 'Remada'],
        'Tozeur': ['Tozeur', 'Degache', 'Tameghza', 'Nefta', 'Hazoua'],
        'Mahdia': ['Mahdia', 'Bou Merdes', 'Ouled Chamekh', 'Chorbane', 'Hebira', 'Ksour Essef', 'El Jem', 'Chebba', 'Souassi', 'Melloulèche', 'Sidi Alouane'],
        'Monastir': ['Monastir', 'Ouerdanine', 'Sahline', 'Zéramdine', 'Béni Hassen', 'Jammel', 'Bembla', 'Moknine', 'Ksar Hellal', 'Ksibet el-Médiouni', 'Sayada-Lamta-Bou Hajar', 'Téboulba', 'Bekalta'],
        'Nabeul': ['Nabeul', 'Dar Chaâbane El Fehri', 'Béni Khiar', 'El Mida', 'Korba', 'Menzel Temime', 'El Haouaria', 'Takelsa', 'Soliman', 'Menzel Bouzelfa', 'Béni Khalled', 'Grombalia', 'Bou Argoub', 'Hammam El Ghezaz', 'Hammamet', 'Kélibia'],
        'Bizerte': ['Bizerte Nord', 'Bizerte Sud', 'Sejnane', 'Joumine', 'Mateur', 'Ghezala', 'Menzel Bourguiba', 'Tinja', 'Utique', 'Ghar El Melh', 'Menzel Jemil', 'El Alia', 'Ras Jebel', 'Rafraf'],
        'Béja': ['Béja Nord', 'Béja Sud', 'Amdoun', 'Nefza', 'Téboursouk', 'Tibar', 'Testour', 'Goubellat', 'Medjez el-Bab'],
        'Jendouba': ['Jendouba', 'Jendouba Nord', 'Bou Salem', 'Tabarka', 'Aïn Draham', 'Fernana', 'Ghardimaou', 'Oued Meliz', 'Balta-Bou Aouane'],
        'Kairouan': ['Kairouan Nord', 'Kairouan Sud', 'Chebika', 'Sbikha', 'Haffouz', 'El Ala', 'Hajeb El Ayoun', 'Nasrallah', 'Cherarda', 'Bouhajla', 'El Oueslatia'],
        'Kasserine': ['Kasserine Nord', 'Kasserine Sud', 'Ezzouhour', 'Hassi El Ferid', 'Sbeitla', 'Sbiba', 'Djedeliane', 'El Ayoun', 'Thala', 'Hidra', 'Foussana', 'Feriana', 'Majel Bel Abbès'],
        'Le Kef': ['Le Kef Ouest', 'Le Kef Est', 'Nebeur', 'Sakiet Sidi Youssef', 'Tajerouine', 'Kalaat Senan', 'Kalaât Khasba', 'Djérissa', 'Ksour', 'Dahmani', 'Sers'],
        'Siliana': ['Siliana Nord', 'Siliana Sud', 'Bou Arada', 'Gaâfour', 'El Krib', 'Sidi Bou Rouis', 'Maktar', 'Rouhia', 'Kesra', 'Bargou', 'El Aroussa'],
        'Sidi Bouzid': ['Sidi Bouzid Ouest', 'Sidi Bouzid Est', 'Jilma', 'Cebbala Ouled Asker', 'Bir El Hafey', 'Sidi Ali Ben Aoun', 'Menzel Bouzaiane', 'Meknassy', 'Souk Jedid', 'Mezzouna', 'Regueb', 'Ouled Haffouz'],
        'Zaghouan': ['Zaghouan', 'Zriba', 'Bir Mcherga', 'Djebel Oust', 'El Fahs', 'Nadhour', 'Saouaf'],
        'Ariana': ['Ariana Ville', 'La Soukra', 'Raoued', 'Kalâat el-Andalous', 'Sidi Thabet', 'Ettadhamen', 'Mnihla'],
        'Ben Arous': ['Ben Arous', 'Nouvelle Médina', 'El Mourouj', 'Hammam Lif', 'Hammam Chott', 'Bou Mhel el-Bassatine', 'Ezzahra', 'Radès', 'Mégrine', 'Mohamedia', 'Fouchana', 'Mornag'],
        'La Manouba': ['La Manouba', 'Oued Ellil', 'Mornaguia', 'Borj El Amri', 'Douar Hicher', 'El Battan', 'Tebourba', 'Jedaïda']
    };
    return delegationsMap[gouvernorat] || [];
}

function getDistanceEstimate(origGouv, origDel, destGouv, destDel) {
    // Simple estimation based on gouvernorats
    const distanceMatrix = {
        'Gabès': { 'Tunis': 400, 'Sfax': 150, 'Sousse': 280, 'Médenine': 80, 'Djerba': 150, 'default': 200 },
        'Tunis': { 'Gabès': 400, 'Sfax': 270, 'Sousse': 140, 'Bizerte': 65, 'Nabeul': 65, 'default': 150 },
        'Sfax': { 'Gabès': 150, 'Tunis': 270, 'Sousse': 130, 'Médenine': 220, 'default': 180 },
        'default': { 'default': 150 }
    };

    const origMatrix = distanceMatrix[origGouv] || distanceMatrix['default'];
    return origMatrix[destGouv] || origMatrix['default'] || 150;
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
                    <label for="planClient">👥 Client *</label>
                    <select id="planClient" required>
                        <option value="">-- Sélectionner un client --</option>
                        ${clientOptions}
                    </select>
                </div>
            </div>

            <!-- Statut -->
            <div class="form-row">
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
                <div class="form-row">
                    <div class="form-group">
                        <label for="planGouvernorat">Gouvernorat</label>
                        <select id="planGouvernorat" required onchange="PlanificationModule.onGouvernoratChange()">
                            <option value="">-- Sélectionner --</option>
                            ${destGouvernoratOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="planDelegation">Délégation</label>
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

function updateDistanceEstimate() {
    const origineGouv = document.getElementById('planOrigineGouvernorat')?.value;
    const origineDel = document.getElementById('planOrigineDelegation')?.value;
    const destGouv = document.getElementById('planGouvernorat')?.value;
    const destDel = document.getElementById('planDelegation')?.value;

    if (origineGouv && destGouv) {
        const distanceAller = getDistanceEstimate(origineGouv, origineDel, destGouv, destDel);
        const distanceRetour = distanceAller;
        const distanceTotal = distanceAller * 2;

        const trajDisplay = document.getElementById('planTrajectoryDisplay');
        if (trajDisplay) {
            const origName = origineDel || origineGouv;
            const destName = destDel || destGouv;
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

function onTruckChange() {
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
        coutTotal += (truck.chargesFixes || 0) + (truck.montantAssurance || 0) + (truck.montantTaxe || 0) + (truck.chargePersonnel || 0);
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
    const distanceAller = getDistanceEstimate(origineGouvernorat, origineDelegation, gouvernorat, delegation);

    const gasoil = parseFloat(document.getElementById('planGasoil')?.value) || 0;
    const prixGasoil = parseFloat(document.getElementById('planPrixGasoil')?.value) || 0;
    const montantGasoil = gasoil * prixGasoil;

    const plan = {
        id: document.getElementById('planId').value || `plan_${Date.now()}`,
        date: document.getElementById('planDate').value,
        clientId: document.getElementById('planClient').value,
        statut: document.getElementById('planStatut').value || 'planifie',
        camionId: document.getElementById('planCamion').value,
        chauffeurId: document.getElementById('planChauffeur').value,
        origineGouvernorat,
        origineDelegation,
        origine: origineDelegation ? `${origineDelegation}, ${origineGouvernorat}` : origineGouvernorat,
        gouvernorat,
        delegation,
        destination: delegation ? `${delegation}, ${gouvernorat}` : gouvernorat,
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

    if (!plan.date || !plan.clientId) {
        alert('La date et le client sont obligatoires');
        return;
    }

    try {
        await setDoc(doc(db, COLLECTIONS.planifications, plan.id), plan);
        App.hideModal();
        await loadPlannings();
        await renderPlannings();
    } catch (error) {
        console.error('Error saving plan:', error);
        alert('Erreur lors de l\'enregistrement: ' + error.message);
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
    updateCalculations
};

window.PlanificationModule = PlanificationModule;
