/**
 * DRIVERS MODULE - FIREBASE VERSION
 * With performance statistics
 */

import { DataModule } from './data-firebase.js';

function init() {
    document.getElementById('addDriverBtn')?.addEventListener('click', () => openModal());
}

async function refresh() {
    await renderDrivers();
}

function calculateDriverStats(driverId) {
    const allEntries = window.DataModule?.cache?.entries || [];
    const driverEntries = allEntries.filter(e => e.chauffeurId === driverId);

    if (driverEntries.length === 0) {
        return {
            totalKm: 0, totalGasoil: 0, totalCout: 0, totalRevenue: 0,
            resultat: 0, coutParKm: 0, consommation: 0, nbTrajets: 0, performance: 0
        };
    }

    let totalKm = 0, totalGasoil = 0, totalCout = 0, totalRevenue = 0;

    driverEntries.forEach(entry => {
        const truck = DataModule.getTruckById(entry.camionId);
        totalKm += entry.kilometrage || 0;
        totalGasoil += entry.quantiteGasoil || 0;
        totalRevenue += entry.prixLivraison || 0;
        const costs = DataModule.calculateEntryCosts(entry, truck);
        totalCout += costs.coutTotal;
    });

    const resultat = totalRevenue - totalCout;
    const coutParKm = totalKm > 0 ? totalCout / totalKm : 0;
    const consommation = totalKm > 0 ? (totalGasoil / totalKm) * 100 : 0;
    const performance = totalRevenue > 0 ? (resultat / totalRevenue) * 100 : 0;

    return { totalKm, totalGasoil, totalCout, totalRevenue, resultat, coutParKm, consommation, nbTrajets: driverEntries.length, performance };
}

async function renderDrivers() {
    const drivers = await DataModule.getDrivers();
    const trucks = await DataModule.getTrucks();
    const grid = document.getElementById('driversGrid');
    if (!grid) return;

    grid.innerHTML = drivers.map(driver => {
        const truck = trucks.find(t => t.id === driver.camionId);
        const stats = calculateDriverStats(driver.id);
        const performanceClass = stats.performance >= 20 ? 'perf-excellent' : stats.performance >= 10 ? 'perf-good' : stats.performance >= 0 ? 'perf-average' : 'perf-bad';
        const resultatClass = stats.resultat >= 0 ? 'result-positive' : 'result-negative';

        return `
        <div class="entity-card driver-card">
            <div class="entity-header">
                <div class="entity-icon">👤</div>
                <div class="entity-info">
                    <h3>${driver.nom}</h3>
                    <span class="entity-badge ${truck ? '' : 'badge-warning'}">${truck ? truck.matricule : 'Non assigné'}</span>
                </div>
                <div class="entity-actions">
                    <button class="btn btn-sm btn-profile" onclick="ProfileModule.openDriverProfile('${driver.id}')" title="Voir Profil">📊</button>
                    <button class="btn btn-sm btn-outline" onclick="DriversModule.edit('${driver.id}')">✏️</button>
                    <button class="btn btn-sm btn-outline" onclick="DriversModule.remove('${driver.id}')">🗑️</button>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-item"><span class="stat-label">🛣️ Kilométrage</span><span class="stat-value">${stats.totalKm.toLocaleString('fr-FR')} km</span></div>
                <div class="stat-item"><span class="stat-label">⛽ Gasoil</span><span class="stat-value">${stats.totalGasoil.toLocaleString('fr-FR')} L</span></div>
                <div class="stat-item"><span class="stat-label">📊 Conso.</span><span class="stat-value">${stats.consommation.toFixed(1)} L/100km</span></div>
                <div class="stat-item"><span class="stat-label">💵 Coût/Km</span><span class="stat-value">${stats.coutParKm.toFixed(2)} TND</span></div>
            </div>
            
            <div class="financial-summary">
                <div class="fin-row"><span>📈 Revenus:</span><span class="result-positive">${stats.totalRevenue.toLocaleString('fr-FR')} TND</span></div>
                <div class="fin-row"><span>📉 Coûts:</span><span class="result-negative">${stats.totalCout.toLocaleString('fr-FR')} TND</span></div>
                <div class="fin-row fin-result"><span>💰 Résultat:</span><span class="${resultatClass}">${stats.resultat.toLocaleString('fr-FR')} TND</span></div>
            </div>
            
            <div class="performance-bar">
                <div class="perf-label"><span>Performance</span><span class="${performanceClass}">${stats.performance.toFixed(1)}%</span></div>
                <div class="perf-track"><div class="perf-fill ${performanceClass}" style="width: ${Math.max(0, Math.min(100, stats.performance + 50))}%"></div></div>
            </div>
            
            <div class="entity-footer">
                <span class="trajet-count">📍 ${stats.nbTrajets} trajet(s)</span>
                ${truck ? `<span class="truck-type">${truck.type}</span>` : ''}
            </div>
        </div>`;
    }).join('');
}

async function openModal(driverId = null) {
    const driver = driverId ? DataModule.getDriverById(driverId) : null;
    const trucks = await DataModule.getTrucks();
    const truckOptions = trucks.map(t => `<option value="${t.id}" ${driver?.camionId === t.id ? 'selected' : ''}>${t.matricule} (${t.type})</option>`).join('');

    document.getElementById('modalTitle').textContent = driver ? 'Modifier Chauffeur' : 'Nouveau Chauffeur';
    document.getElementById('modalBody').innerHTML = `
        <form id="driverForm">
            <input type="hidden" id="driverId" value="${driver?.id || ''}">
            <div class="form-group"><label>Nom</label><input type="text" id="driverNom" value="${driver?.nom || ''}" required></div>
            <div class="form-group"><label>Camion Assigné</label><select id="driverCamion"><option value="">-- Non assigné --</option>${truckOptions}</select></div>
        </form>`;
    document.getElementById('modalSave').onclick = saveDriver;
    App.showModal();
}

async function saveDriver() {
    const driver = {
        id: document.getElementById('driverId').value || null,
        nom: document.getElementById('driverNom').value,
        camionId: document.getElementById('driverCamion').value || null
    };
    if (!driver.nom) { alert('Nom requis'); return; }
    await DataModule.saveDriver(driver);
    App.hideModal();
    refresh();
}

function edit(id) { openModal(id); }

async function remove(id) {
    if (confirm('Supprimer ce chauffeur ?')) {
        await DataModule.deleteDriver(id);
        refresh();
    }
}

export const DriversModule = { init, refresh, edit, remove };
window.DriversModule = DriversModule;
