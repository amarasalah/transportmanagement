/**
 * TRUCKS MODULE
 * Handles truck management UI
 */

const TrucksModule = (() => {
    function init() {
        document.getElementById('addTruckBtn')?.addEventListener('click', () => openModal());
    }

    function refresh() {
        renderTrucks();
    }

    function renderTrucks() {
        const trucks = DataModule.getTrucks();
        const grid = document.getElementById('trucksGrid');
        if (!grid) return;

        grid.innerHTML = trucks.map(truck => {
            const typeClass = truck.type === 'PLATEAU' ? 'type-plateau' : 'type-benne';
            return `
            <div class="entity-card">
                <div class="entity-header">
                    <div>
                        <span class="entity-icon">${truck.type === 'PLATEAU' ? '🚛' : '🚜'}</span>
                        <span class="badge ${typeClass}">${truck.type}</span>
                    </div>
                    <div class="entity-actions">
                        <button class="btn btn-sm btn-outline" onclick="TrucksModule.edit('${truck.id}')">✏️</button>
                        <button class="btn btn-sm btn-outline" onclick="TrucksModule.remove('${truck.id}')">🗑️</button>
                    </div>
                </div>
                <div class="entity-title">${truck.matricule}</div>
                <div class="entity-stats">
                    <div class="stat-item">
                        <span class="stat-label">Charges Fixes</span>
                        <span class="stat-value">${truck.chargesFixes} TND</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Assurance</span>
                        <span class="stat-value">${truck.montantAssurance} TND</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Taxe</span>
                        <span class="stat-value">${truck.montantTaxe} TND</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Personnel</span>
                        <span class="stat-value">${truck.chargePersonnel} TND</span>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    function openModal(truckId = null) {
        const truck = truckId ? DataModule.getTruckById(truckId) : null;
        const title = truck ? 'Modifier Camion' : 'Ajouter Camion';

        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = `
            <form id="truckForm">
                <input type="hidden" id="truckId" value="${truck?.id || ''}">
                <div class="form-group">
                    <label for="truckMatricule">Matricule</label>
                    <input type="text" id="truckMatricule" value="${truck?.matricule || ''}" required placeholder="Ex: 8565 TU 257">
                </div>
                <div class="form-group">
                    <label for="truckType">Type de transport</label>
                    <select id="truckType" required>
                        <option value="PLATEAU" ${truck?.type === 'PLATEAU' ? 'selected' : ''}>PLATEAU (Plateau)</option>
                        <option value="BENNE" ${truck?.type === 'BENNE' ? 'selected' : ''}>BENNE (Benne)</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="truckCharges">Charges Fixes (TND)</label>
                        <input type="number" id="truckCharges" value="${truck?.chargesFixes || 80}" min="0" required>
                    </div>
                    <div class="form-group">
                        <label for="truckAssurance">Assurance (TND)</label>
                        <input type="number" id="truckAssurance" value="${truck?.montantAssurance || 20}" min="0" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="truckTaxe">Taxe (TND)</label>
                        <input type="number" id="truckTaxe" value="${truck?.montantTaxe || 20}" min="0" required>
                    </div>
                    <div class="form-group">
                        <label for="truckPersonnel">Charge Personnel (TND)</label>
                        <input type="number" id="truckPersonnel" value="${truck?.chargePersonnel || 80}" min="0" required>
                    </div>
                </div>
            </form>
        `;

        document.getElementById('modalSave').onclick = saveTruck;
        App.showModal();
    }

    function saveTruck() {
        const truck = {
            id: document.getElementById('truckId').value || null,
            matricule: document.getElementById('truckMatricule').value,
            type: document.getElementById('truckType').value,
            chargesFixes: parseFloat(document.getElementById('truckCharges').value),
            montantAssurance: parseFloat(document.getElementById('truckAssurance').value),
            montantTaxe: parseFloat(document.getElementById('truckTaxe').value),
            chargePersonnel: parseFloat(document.getElementById('truckPersonnel').value)
        };

        if (!truck.matricule) {
            alert('Veuillez saisir le matricule');
            return;
        }

        DataModule.saveTruck(truck);
        App.hideModal();
        refresh();
    }

    function edit(id) {
        openModal(id);
    }

    function remove(id) {
        if (confirm('Supprimer ce camion ?')) {
            DataModule.deleteTruck(id);
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
