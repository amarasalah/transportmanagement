/**
 * PLANIFICATION MODULE - FIREBASE VERSION
 * Gestion de la planification des livraisons avec sélection de clients
 */

import { db, collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, COLLECTIONS } from './firebase.js';
import { DataModule } from './data-firebase.js';
import { ClientsModule } from './clients-firebase.js';

let cache = [];

async function init() {
    document.getElementById('addPlanBtn')?.addEventListener('click', () => openModal());
    document.getElementById('planFilterBtn')?.addEventListener('click', () => applyFilters());

    // Set default date range (current week)
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startInput = document.getElementById('planDateStart');
    const endInput = document.getElementById('planDateEnd');
    if (startInput) startInput.value = startOfWeek.toISOString().split('T')[0];
    if (endInput) endInput.value = endOfWeek.toISOString().split('T')[0];

    await loadPlannings();
    await loadClientFilter();
    console.log('📅 PlanificationModule initialized');
}

async function loadPlannings() {
    try {
        const q = query(collection(db, COLLECTIONS.planifications || 'planifications'), orderBy('date', 'asc'));
        const snap = await getDocs(q);
        cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return cache;
    } catch (error) {
        console.error('Error loading planifications:', error);
        // Fallback without orderBy
        const snap = await getDocs(collection(db, COLLECTIONS.planifications || 'planifications'));
        cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return cache;
    }
}

async function loadClientFilter() {
    const select = document.getElementById('planClientFilter');
    if (!select) return;

    const clients = await ClientsModule.getClients();

    // Keep first option (Tous les clients)
    select.innerHTML = '<option value="">Tous les clients</option>';

    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = client.nom;
        select.appendChild(option);
    });
}

async function getPlannings() {
    if (cache.length === 0) await loadPlannings();
    return cache;
}

function getPlanningById(id) {
    return cache.find(p => p.id === id);
}

async function refresh() {
    await loadPlannings();
    await loadClientFilter();
    await renderPlannings();
}

async function applyFilters() {
    await renderPlannings();
}

async function renderPlannings() {
    let plannings = await getPlannings();
    const tbody = document.getElementById('planningBody');
    const statsDiv = document.getElementById('planningStats');
    if (!tbody) return;

    // Apply filters
    const startDate = document.getElementById('planDateStart')?.value;
    const endDate = document.getElementById('planDateEnd')?.value;
    const clientId = document.getElementById('planClientFilter')?.value;
    const status = document.getElementById('planStatusFilter')?.value;

    if (startDate) {
        plannings = plannings.filter(p => p.date >= startDate);
    }
    if (endDate) {
        plannings = plannings.filter(p => p.date <= endDate);
    }
    if (clientId) {
        plannings = plannings.filter(p => p.clientId === clientId);
    }
    if (status) {
        plannings = plannings.filter(p => p.statut === status);
    }

    // Get clients for display
    const clients = await ClientsModule.getClients();
    const trucks = await DataModule.getTrucks();
    const drivers = await DataModule.getDrivers();

    // Update stats
    if (statsDiv) {
        const total = plannings.length;
        const planifie = plannings.filter(p => p.statut === 'planifie').length;
        const enCours = plannings.filter(p => p.statut === 'en_cours').length;
        const termine = plannings.filter(p => p.statut === 'termine').length;

        statsDiv.innerHTML = `
            <span>📊 Total: ${total}</span>
            <span>📅 Planifié: ${planifie}</span>
            <span>🚚 En cours: ${enCours}</span>
            <span>✅ Terminé: ${termine}</span>
        `;
    }

    if (plannings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state">Aucune planification. Cliquez sur + pour ajouter.</td></tr>';
        return;
    }

    tbody.innerHTML = plannings.map(p => {
        const client = clients.find(c => c.id === p.clientId);
        const truck = trucks.find(t => t.id === p.truckId);
        const driver = drivers.find(d => d.id === p.driverId);

        const statusClass = {
            'planifie': 'status-warning',
            'en_cours': 'status-info',
            'termine': 'status-success',
            'annule': 'status-danger'
        }[p.statut] || 'status-default';

        const statusLabel = {
            'planifie': 'Planifié',
            'en_cours': 'En cours',
            'termine': 'Terminé',
            'annule': 'Annulé'
        }[p.statut] || p.statut;

        return `
            <tr>
                <td>${formatDate(p.date)}</td>
                <td><strong>${client?.nom || '-'}</strong></td>
                <td>${p.destination || '-'}</td>
                <td>${truck?.matricule || '-'}</td>
                <td>${driver?.nom || '-'}</td>
                <td>${p.typeTransport || '-'}</td>
                <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                <td>${p.notes || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="PlanificationModule.edit('${p.id}')" title="Modifier">✏️</button>
                    <button class="btn btn-sm btn-success" onclick="PlanificationModule.convertToEntry('${p.id}')" title="Convertir en saisie">📝</button>
                    <button class="btn btn-sm btn-danger" onclick="PlanificationModule.remove('${p.id}')" title="Supprimer">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR');
}

async function openModal(planId = null) {
    const plan = planId ? getPlanningById(planId) : null;
    const title = plan ? 'Modifier Planification' : 'Nouvelle Planification';
    const today = new Date().toISOString().split('T')[0];

    const clients = await ClientsModule.getClients();
    const trucks = await DataModule.getTrucks();
    const drivers = await DataModule.getDrivers();

    const clientOptions = clients.map(c =>
        `<option value="${c.id}" ${plan?.clientId === c.id ? 'selected' : ''}>${c.nom}</option>`
    ).join('');

    const truckOptions = trucks.map(t =>
        `<option value="${t.id}" ${plan?.truckId === t.id ? 'selected' : ''}>${t.matricule}</option>`
    ).join('');

    const driverOptions = drivers.map(d =>
        `<option value="${d.id}" ${plan?.driverId === d.id ? 'selected' : ''}>${d.nom}</option>`
    ).join('');

    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = `
        <form id="planForm">
            <input type="hidden" id="planId" value="${plan?.id || ''}">
            <div class="form-row">
                <div class="form-group">
                    <label>Date *</label>
                    <input type="date" id="planDate" value="${plan?.date || today}" required>
                </div>
                <div class="form-group">
                    <label>Client *</label>
                    <select id="planClient" required>
                        <option value="">Sélectionner un client</option>
                        ${clientOptions}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Destination</label>
                    <input type="text" id="planDestination" value="${plan?.destination || ''}" placeholder="Ville ou adresse">
                </div>
                <div class="form-group">
                    <label>Type transport</label>
                    <select id="planType">
                        <option value="PLATEAU" ${plan?.typeTransport === 'PLATEAU' ? 'selected' : ''}>PLATEAU</option>
                        <option value="BENNE" ${plan?.typeTransport === 'BENNE' ? 'selected' : ''}>BENNE</option>
                        <option value="CITERNE" ${plan?.typeTransport === 'CITERNE' ? 'selected' : ''}>CITERNE</option>
                        <option value="FRIGO" ${plan?.typeTransport === 'FRIGO' ? 'selected' : ''}>FRIGO</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Camion</label>
                    <select id="planTruck">
                        <option value="">Sélectionner un camion</option>
                        ${truckOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Chauffeur</label>
                    <select id="planDriver">
                        <option value="">Sélectionner un chauffeur</option>
                        ${driverOptions}
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Statut</label>
                    <select id="planStatus">
                        <option value="planifie" ${plan?.statut === 'planifie' ? 'selected' : ''}>Planifié</option>
                        <option value="en_cours" ${plan?.statut === 'en_cours' ? 'selected' : ''}>En cours</option>
                        <option value="termine" ${plan?.statut === 'termine' ? 'selected' : ''}>Terminé</option>
                        <option value="annule" ${plan?.statut === 'annule' ? 'selected' : ''}>Annulé</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Prix estimé (TND)</label>
                    <input type="number" id="planPrix" value="${plan?.prixEstime || ''}" step="0.001">
                </div>
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea id="planNotes" rows="2" placeholder="Instructions spéciales, horaires...">${plan?.notes || ''}</textarea>
            </div>
        </form>
    `;

    document.getElementById('modalSave').onclick = savePlanning;
    App.showModal();
}

async function savePlanning() {
    const plan = {
        id: document.getElementById('planId').value || `plan_${Date.now()}`,
        date: document.getElementById('planDate').value,
        clientId: document.getElementById('planClient').value,
        destination: document.getElementById('planDestination').value,
        typeTransport: document.getElementById('planType').value,
        truckId: document.getElementById('planTruck').value,
        driverId: document.getElementById('planDriver').value,
        statut: document.getElementById('planStatus').value,
        prixEstime: parseFloat(document.getElementById('planPrix').value) || 0,
        notes: document.getElementById('planNotes').value,
        updatedAt: new Date().toISOString()
    };

    if (!plan.date || !plan.clientId) {
        alert('La date et le client sont obligatoires');
        return;
    }

    try {
        await setDoc(doc(db, COLLECTIONS.planifications || 'planifications', plan.id), plan);
        App.hideModal();
        await refresh();
    } catch (error) {
        console.error('Error saving planning:', error);
        alert('Erreur lors de l\'enregistrement');
    }
}

function edit(id) {
    openModal(id);
}

async function remove(id) {
    if (confirm('Supprimer cette planification ?')) {
        try {
            await deleteDoc(doc(db, COLLECTIONS.planifications || 'planifications', id));
            await refresh();
        } catch (error) {
            console.error('Error deleting planning:', error);
        }
    }
}

async function convertToEntry(planId) {
    const plan = getPlanningById(planId);
    if (!plan) return;

    if (!confirm('Convertir cette planification en saisie journalière ?')) return;

    const trucks = await DataModule.getTrucks();
    const drivers = await DataModule.getDrivers();
    const truck = trucks.find(t => t.id === plan.truckId);
    const driver = drivers.find(d => d.id === plan.driverId);

    // Create entry from planning
    const entry = {
        id: `entry_${Date.now()}`,
        date: plan.date,
        matricule: truck?.matricule || '',
        chauffeur: driver?.nom || '',
        typeTransport: plan.typeTransport,
        destination: plan.destination,
        origine: 'GABES',
        km: 0,
        gasoil: 0,
        prixGasoil: 2,
        recette: plan.prixEstime || 0,
        depenses: 0,
        notes: plan.notes,
        fromPlanification: plan.id,
        createdAt: new Date().toISOString()
    };

    try {
        await setDoc(doc(db, COLLECTIONS.entries, entry.id), entry);

        // Update planning status to "termine"
        plan.statut = 'termine';
        plan.convertedToEntry = entry.id;
        await setDoc(doc(db, COLLECTIONS.planifications || 'planifications', plan.id), plan);

        await refresh();
        alert('Planification convertie en saisie journalière!');
    } catch (error) {
        console.error('Error converting to entry:', error);
        alert('Erreur lors de la conversion');
    }
}

export const PlanificationModule = {
    init,
    refresh,
    getPlannings,
    getPlanningById,
    edit,
    remove,
    convertToEntry
};

window.PlanificationModule = PlanificationModule;
