/**
 * TRUCKS MODULE
 * Updated for async Firebase operations
 */

import { DataModule } from './data-firebase.js';

function init() {
    document.getElementById('addTruckBtn')?.addEventListener('click', () => openModal());
}

async function refresh() {
    await renderTrucks();
}

async function renderTrucks() {
    const trucks = await DataModule.getTrucks();
    const grid = document.getElementById('trucksGrid');
    if (!grid) return;

    if (trucks.length === 0) {
        grid.innerHTML = '<div class="empty-state">Aucun camion enregistré</div>';
        return;
    }

    grid.innerHTML = trucks.map(truck => `
        <div class="entity-card">
            <div class="entity-icon">🚛</div>
            <div class="entity-title">${truck.matricule}</div>
            <div class="entity-subtitle">${truck.type}</div>
            <div class="entity-details">
                <div><span>Charges fixes:</span> ${truck.chargesFixes} TND</div>
                <div><span>Assurance:</span> ${truck.montantAssurance} TND</div>
                <div><span>Taxe:</span> ${truck.montantTaxe} TND</div>
                <div><span>Personnel:</span> ${truck.chargePersonnel} TND</div>
            </div>
            <div class="entity-actions">
                <button class="btn btn-sm btn-primary" onclick="TrucksModule.edit('${truck.id}')">Modifier</button>
                <button class="btn btn-sm btn-outline" onclick="TrucksModule.remove('${truck.id}')">Supprimer</button>
            </div>
        </div>
    `).join('');
}

async function openModal(truckId = null) {
    const trucks = await DataModule.getTrucks();
    const truck = truckId ? trucks.find(t => t.id === truckId) : null;
    const title = truck ? 'Modifier Camion' : 'Nouveau Camion';

    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = `
        <form id="truckForm">
            <input type="hidden" id="truckId" value="${truck?.id || ''}">
            <div class="form-row">
                <div class="form-group">
                    <label for="truckMatricule">Matricule</label>
                    <input type="text" id="truckMatricule" value="${truck?.matricule || ''}" required placeholder="Ex: 1234 TU 123">
                </div>
                <div class="form-group">
                    <label for="truckType">Type</label>
                    <select id="truckType" required>
                        <option value="PLATEAU" ${truck?.type === 'PLATEAU' ? 'selected' : ''}>PLATEAU</option>
                        <option value="BENNE" ${truck?.type === 'BENNE' ? 'selected' : ''}>BENNE</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="truckCharges">Charges Fixes (TND)</label>
                    <input type="number" id="truckCharges" value="${truck?.chargesFixes || 80}" min="0">
                </div>
                <div class="form-group">
                    <label for="truckAssurance">Assurance (TND)</label>
                    <input type="number" id="truckAssurance" value="${truck?.montantAssurance || 20}" min="0">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="truckTaxe">Taxe (TND)</label>
                    <input type="number" id="truckTaxe" value="${truck?.montantTaxe || 20}" min="0">
                </div>
                <div class="form-group">
                    <label for="truckPersonnel">Charge Personnel (TND)</label>
                    <input type="number" id="truckPersonnel" value="${truck?.chargePersonnel || 80}" min="0">
                </div>
            </div>
        </form>
    `;

    document.getElementById('modalSave').onclick = saveTruck;
    App.showModal();
}

async function saveTruck() {
    const truck = {
        id: document.getElementById('truckId').value || null,
        matricule: document.getElementById('truckMatricule').value.toUpperCase(),
        type: document.getElementById('truckType').value,
        chargesFixes: parseFloat(document.getElementById('truckCharges').value) || 0,
        montantAssurance: parseFloat(document.getElementById('truckAssurance').value) || 0,
        montantTaxe: parseFloat(document.getElementById('truckTaxe').value) || 0,
        chargePersonnel: parseFloat(document.getElementById('truckPersonnel').value) || 0
    };

    if (!truck.matricule) {
        alert('Veuillez saisir le matricule');
        return;
    }

    await DataModule.saveTruck(truck);
    App.hideModal();
    App.refreshCurrentPage();
}

function edit(id) {
    openModal(id);
}

async function remove(id) {
    if (confirm('Supprimer ce camion?')) {
        await DataModule.deleteTruck(id);
        App.refreshCurrentPage();
    }
}

export const TrucksModule = {
    init,
    refresh,
    edit,
    remove
};

window.TrucksModule = TrucksModule;
