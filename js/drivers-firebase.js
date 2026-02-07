/**
 * DRIVERS MODULE
 * Updated for async Firebase operations
 */

import { DataModule } from './data-firebase.js';

function init() {
    document.getElementById('addDriverBtn')?.addEventListener('click', () => openModal());
}

async function refresh() {
    await renderDrivers();
}

async function renderDrivers() {
    const drivers = await DataModule.getDrivers();
    const trucks = await DataModule.getTrucks();
    const grid = document.getElementById('driversGrid');
    if (!grid) return;

    if (drivers.length === 0) {
        grid.innerHTML = '<div class="empty-state">Aucun chauffeur enregistré</div>';
        return;
    }

    grid.innerHTML = drivers.map(driver => {
        const truck = trucks.find(t => t.id === driver.camionId);
        return `
            <div class="entity-card">
                <div class="entity-icon">👤</div>
                <div class="entity-title">${driver.nom}</div>
                <div class="entity-subtitle">${truck ? truck.matricule : 'Non assigné'}</div>
                <div class="entity-details">
                    <div><span>Type:</span> ${truck?.type || '-'}</div>
                </div>
                <div class="entity-actions">
                    <button class="btn btn-sm btn-primary" onclick="DriversModule.edit('${driver.id}')">Modifier</button>
                    <button class="btn btn-sm btn-outline" onclick="DriversModule.remove('${driver.id}')">Supprimer</button>
                </div>
            </div>
        `;
    }).join('');
}

async function openModal(driverId = null) {
    const drivers = await DataModule.getDrivers();
    const trucks = await DataModule.getTrucks();
    const driver = driverId ? drivers.find(d => d.id === driverId) : null;
    const title = driver ? 'Modifier Chauffeur' : 'Nouveau Chauffeur';

    const truckOptions = trucks.map(t =>
        `<option value="${t.id}" ${driver?.camionId === t.id ? 'selected' : ''}>${t.matricule} (${t.type})</option>`
    ).join('');

    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = `
        <form id="driverForm">
            <input type="hidden" id="driverId" value="${driver?.id || ''}">
            <div class="form-group">
                <label for="driverNom">Nom du Chauffeur</label>
                <input type="text" id="driverNom" value="${driver?.nom || ''}" required placeholder="Ex: MOHAMED">
            </div>
            <div class="form-group">
                <label for="driverCamion">Camion Assigné</label>
                <select id="driverCamion">
                    <option value="">-- Non assigné --</option>
                    ${truckOptions}
                </select>
            </div>
        </form>
    `;

    document.getElementById('modalSave').onclick = saveDriver;
    App.showModal();
}

async function saveDriver() {
    const driver = {
        id: document.getElementById('driverId').value || null,
        nom: document.getElementById('driverNom').value.toUpperCase(),
        camionId: document.getElementById('driverCamion').value || null
    };

    if (!driver.nom) {
        alert('Veuillez saisir le nom du chauffeur');
        return;
    }

    await DataModule.saveDriver(driver);
    App.hideModal();
    App.refreshCurrentPage();
}

function edit(id) {
    openModal(id);
}

async function remove(id) {
    if (confirm('Supprimer ce chauffeur?')) {
        await DataModule.deleteDriver(id);
        App.refreshCurrentPage();
    }
}

export const DriversModule = {
    init,
    refresh,
    edit,
    remove
};

window.DriversModule = DriversModule;
