/**
 * DRIVERS MODULE
 * Handles driver management UI
 */

const DriversModule = (() => {
    function init() {
        document.getElementById('addDriverBtn')?.addEventListener('click', () => openModal());
    }

    function refresh() {
        renderDrivers();
    }

    function renderDrivers() {
        const drivers = DataModule.getDrivers();
        const trucks = DataModule.getTrucks();
        const grid = document.getElementById('driversGrid');
        if (!grid) return;

        grid.innerHTML = drivers.map(driver => {
            const truck = trucks.find(t => t.id === driver.camionId);
            return `
            <div class="entity-card">
                <div class="entity-header">
                    <div>
                        <span class="entity-icon">👤</span>
                    </div>
                    <div class="entity-actions">
                        <button class="btn btn-sm btn-outline" onclick="DriversModule.edit('${driver.id}')">✏️</button>
                        <button class="btn btn-sm btn-outline" onclick="DriversModule.remove('${driver.id}')">🗑️</button>
                    </div>
                </div>
                <div class="entity-title">${driver.nom}</div>
                <div class="entity-subtitle">${truck ? truck.matricule : 'Non assigné'}</div>
                <div class="entity-stats">
                    <div class="stat-item">
                        <span class="stat-label">Camion assigné</span>
                        <span class="stat-value">${truck?.type || '-'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Statut</span>
                        <span class="stat-value badge ${truck ? 'badge-success' : 'badge-warning'}">${truck ? 'Actif' : 'En attente'}</span>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    function openModal(driverId = null) {
        const driver = driverId ? DataModule.getDriverById(driverId) : null;
        const trucks = DataModule.getTrucks();
        const title = driver ? 'Modifier Chauffeur' : 'Ajouter Chauffeur';

        const truckOptions = trucks.map(t =>
            `<option value="${t.id}" ${driver?.camionId === t.id ? 'selected' : ''}>${t.matricule}</option>`
        ).join('');

        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = `
            <form id="driverForm">
                <input type="hidden" id="driverId" value="${driver?.id || ''}">
                <div class="form-group">
                    <label for="driverNom">Nom du chauffeur</label>
                    <input type="text" id="driverNom" value="${driver?.nom || ''}" required placeholder="Ex: MOHAMMED">
                </div>
                <div class="form-group">
                    <label for="driverCamion">Camion assigné</label>
                    <select id="driverCamion">
                        <option value="">-- Aucun --</option>
                        ${truckOptions}
                    </select>
                </div>
            </form>
        `;

        document.getElementById('modalSave').onclick = saveDriver;
        App.showModal();
    }

    function saveDriver() {
        const driver = {
            id: document.getElementById('driverId').value || null,
            nom: document.getElementById('driverNom').value.toUpperCase(),
            camionId: document.getElementById('driverCamion').value || null
        };

        if (!driver.nom) {
            alert('Veuillez saisir le nom');
            return;
        }

        DataModule.saveDriver(driver);
        App.hideModal();
        refresh();
    }

    function edit(id) {
        openModal(id);
    }

    function remove(id) {
        if (confirm('Supprimer ce chauffeur ?')) {
            DataModule.deleteDriver(id);
            refresh();
        }
    }

    return {
        init,
        refresh,
        edit,
        remove
    };
})();
