/**
 * REPORTS MODULE - ENHANCED VERSION
 * With charts, ERP integration, and date range filtering
 */

import { DataModule } from './data-firebase.js';
import { db, collection, getDocs, query, orderBy, where, COLLECTIONS } from './firebase.js';

let monthlyCharts = {};

function init() {
    document.getElementById('reportMonth')?.addEventListener('change', () => {
        // Clear date range when month is selected
        const ds = document.getElementById('reportDateStart');
        const de = document.getElementById('reportDateEnd');
        if (ds) ds.value = '';
        if (de) de.value = '';
        refresh();
    });
    document.getElementById('reportFilterBtn')?.addEventListener('click', () => {
        // Clear month when date range is used
        const ds = document.getElementById('reportDateStart')?.value;
        const de = document.getElementById('reportDateEnd')?.value;
        if (ds || de) {
            const monthSel = document.getElementById('reportMonth');
            if (monthSel) monthSel.value = '';
        }
        refresh();
    });
    populateMonthSelector();
}

/**
 * Get the active date range from either the month dropdown or the date inputs.
 * Returns { startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD', label: string }
 */
function getDateRange() {
    const dateStart = document.getElementById('reportDateStart')?.value;
    const dateEnd = document.getElementById('reportDateEnd')?.value;
    const selectedMonth = document.getElementById('reportMonth')?.value;

    // Priority: date range inputs if filled
    if (dateStart || dateEnd) {
        const start = dateStart || '2000-01-01';
        const end = dateEnd || '2099-12-31';
        const startLabel = dateStart ? new Date(dateStart + 'T00:00').toLocaleDateString('fr-FR') : '...';
        const endLabel = dateEnd ? new Date(dateEnd + 'T00:00').toLocaleDateString('fr-FR') : '...';
        return { startDate: start, endDate: end, label: `${startLabel} → ${endLabel}` };
    }

    // Fallback: month dropdown
    if (selectedMonth) {
        const [year, month] = selectedMonth.split('-');
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
        const label = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        return { startDate, endDate, label };
    }

    return null;
}

async function populateMonthSelector() {
    const select = document.getElementById('reportMonth');
    if (!select) return;

    const entries = await DataModule.getEntries();
    const months = new Set();

    entries.forEach(entry => {
        if (!entry.date) return;
        const parts = entry.date.split('-');
        if (parts.length === 3) {
            const key = `${parts[0]}-${parts[1]}`;
            months.add(key);
        }
    });

    const sortedMonths = Array.from(months).sort().reverse();

    select.innerHTML = '<option value="">-- Mois --</option>' + sortedMonths.map(m => {
        const [year, month] = m.split('-');
        const monthName = new Date(year, month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        return `<option value="${m}">${monthName}</option>`;
    }).join('');

    // Auto-select current month if available
    if (sortedMonths.length > 0) {
        select.value = sortedMonths[0];
    }
}

async function refresh() {
    await renderMonthlyReport();
    await renderCharts();
    await renderERPSummary();
}

async function renderMonthlyReport() {
    const tbody = document.getElementById('monthlyBody');
    const tfoot = document.getElementById('monthlyFoot');
    if (!tbody) return;

    const range = getDateRange();
    if (!range) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;padding:40px;">Sélectionnez un mois ou une plage de dates</td></tr>';
        if (tfoot) tfoot.innerHTML = '';
        return;
    }

    const entries = (await DataModule.getEntries()).filter(e =>
        e.date && e.date >= range.startDate && e.date <= range.endDate
    );
    const trucks = await DataModule.getTrucks();

    const truckData = {};
    trucks.forEach(truck => {
        truckData[truck.id] = {
            matricule: truck.matricule,
            totalKm: 0,
            totalGasoil: 0,
            totalGasoilCost: 0,
            totalCost: 0,
            totalRevenue: 0,
            result: 0
        };
    });

    // Track first trip per truck per day (fixed charges only once)
    const truckDaySeen = new Set();

    entries.forEach(entry => {
        const truck = DataModule.getTruckById(entry.camionId);
        if (!truck || !truckData[truck.id]) return;

        const key = `${entry.camionId}_${entry.date}`;
        const isFirstTrip = !truckDaySeen.has(key);
        truckDaySeen.add(key);

        const costs = DataModule.calculateEntryCosts(entry, truck, isFirstTrip);

        truckData[truck.id].totalKm += entry.kilometrage || 0;
        truckData[truck.id].totalGasoil += entry.quantiteGasoil || 0;
        truckData[truck.id].totalGasoilCost += costs.montantGasoil;
        truckData[truck.id].totalCost += costs.coutTotal;
        truckData[truck.id].totalRevenue += entry.prixLivraison || 0;
        truckData[truck.id].result += costs.resultat;
    });

    const activeTrucks = Object.values(truckData).filter(t => t.totalKm > 0 || t.totalRevenue > 0 || t.totalCost > 0);

    let grandTotalKm = 0, grandTotalGasoil = 0, grandTotalGasoilCost = 0;
    let grandTotalCost = 0, grandTotalRevenue = 0, grandTotalResult = 0;

    tbody.innerHTML = activeTrucks.map(t => {
        grandTotalKm += t.totalKm;
        grandTotalGasoil += t.totalGasoil;
        grandTotalGasoilCost += t.totalGasoilCost;
        grandTotalCost += t.totalCost;
        grandTotalRevenue += t.totalRevenue;
        grandTotalResult += t.result;

        const resultClass = t.result >= 0 ? 'result-positive' : 'result-negative';

        return `<tr>
            <td>${t.matricule}</td>
            <td>${t.totalKm.toLocaleString('fr-FR')}</td>
            <td>${t.totalGasoil.toLocaleString('fr-FR')} L</td>
            <td>${t.totalGasoilCost.toLocaleString('fr-FR')} TND</td>
            <td>${t.totalCost.toLocaleString('fr-FR')} TND</td>
            <td>${t.totalRevenue.toLocaleString('fr-FR')} TND</td>
            <td class="${resultClass}">${t.result.toLocaleString('fr-FR')} TND</td>
        </tr>`;
    }).join('');

    if (activeTrucks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;padding:40px;">Aucune donnée pour cette période</td></tr>';
    }

    const resultClass = grandTotalResult >= 0 ? 'result-positive' : 'result-negative';
    if (tfoot) {
        tfoot.innerHTML = `<tr>
            <td><strong>TOTAL (${range.label})</strong></td>
            <td><strong>${grandTotalKm.toLocaleString('fr-FR')}</strong></td>
            <td><strong>${grandTotalGasoil.toLocaleString('fr-FR')} L</strong></td>
            <td><strong>${grandTotalGasoilCost.toLocaleString('fr-FR')} TND</strong></td>
            <td><strong>${grandTotalCost.toLocaleString('fr-FR')} TND</strong></td>
            <td><strong>${grandTotalRevenue.toLocaleString('fr-FR')} TND</strong></td>
            <td class="${resultClass}"><strong>${grandTotalResult.toLocaleString('fr-FR')} TND</strong></td>
        </tr>`;
    }
}

async function renderCharts() {
    const chartsContainer = document.getElementById('chartsContainer');
    if (!chartsContainer) return;

    const range = getDateRange();
    if (!range) {
        chartsContainer.innerHTML = '';
        return;
    }

    const entries = (await DataModule.getEntries()).filter(e =>
        e.date && e.date >= range.startDate && e.date <= range.endDate
    );
    const trucks = await DataModule.getTrucks();

    // Aggregate data per truck
    const truckStats = {};
    trucks.forEach(t => {
        truckStats[t.id] = { matricule: t.matricule, revenue: 0, cost: 0, result: 0 };
    });

    // Track first trip per truck per day (fixed charges only once)
    const truckDaySeen = new Set();

    entries.forEach(entry => {
        const truck = DataModule.getTruckById(entry.camionId);
        if (!truck) return;
        const key = `${entry.camionId}_${entry.date}`;
        const isFirstTrip = !truckDaySeen.has(key);
        truckDaySeen.add(key);
        const costs = DataModule.calculateEntryCosts(entry, truck, isFirstTrip);
        truckStats[truck.id].revenue += entry.prixLivraison || 0;
        truckStats[truck.id].cost += costs.coutTotal;
        truckStats[truck.id].result += costs.resultat;
    });

    const activeStats = Object.values(truckStats).filter(t => t.revenue > 0 || t.cost > 0);

    if (activeStats.length === 0) {
        chartsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #64748b;">
                📊 Aucune donnée de graphique disponible pour cette période
            </div>
        `;
        return;
    }

    const maxValue = Math.max(...activeStats.map(t => Math.max(t.revenue, t.cost)));
    const barWidth = Math.min(60, 400 / activeStats.length);

    chartsContainer.innerHTML = `
        <div class="charts-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px;">
            <!-- Revenue vs Cost Bar Chart -->
            <div class="chart-card" style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px;">
                <h4 style="margin: 0 0 16px 0; color: #8b5cf6;">📊 Revenus vs Coûts par Camion</h4>
                <div class="bar-chart" style="display: flex; align-items: flex-end; justify-content: space-around; height: 200px; border-bottom: 1px solid #333;">
                    ${activeStats.slice(0, 8).map(t => `
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                            <div style="display: flex; gap: 2px; align-items: flex-end;">
                                <div style="width: ${barWidth / 2}px; height: ${(t.revenue / maxValue) * 150}px; background: linear-gradient(to top, #10b981, #34d399); border-radius: 4px 4px 0 0;" title="Revenu: ${t.revenue.toFixed(0)} TND"></div>
                                <div style="width: ${barWidth / 2}px; height: ${(t.cost / maxValue) * 150}px; background: linear-gradient(to top, #ef4444, #f87171); border-radius: 4px 4px 0 0;" title="Coût: ${t.cost.toFixed(0)} TND"></div>
                            </div>
                            <span style="font-size: 0.65rem; color: #94a3b8; transform: rotate(-45deg); white-space: nowrap;">${t.matricule.slice(-6)}</span>
                        </div>
                    `).join('')}
                </div>
                <div style="display: flex; justify-content: center; gap: 20px; margin-top: 10px; font-size: 0.75rem;">
                    <span><span style="display: inline-block; width: 12px; height: 12px; background: #10b981; border-radius: 2px;"></span> Revenus</span>
                    <span><span style="display: inline-block; width: 12px; height: 12px; background: #ef4444; border-radius: 2px;"></span> Coûts</span>
                </div>
            </div>

            <!-- Profitability Ranking -->
            <div class="chart-card" style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 16px;">
                <h4 style="margin: 0 0 16px 0; color: #10b981;">🏆 Rentabilité par Camion</h4>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${activeStats
            .sort((a, b) => b.result - a.result)
            .slice(0, 6)
            .map((t, i) => `
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: ${i < 3 ? '#10b981' : '#64748b'}; border-radius: 50%; font-size: 0.75rem; font-weight: bold;">${i + 1}</span>
                                <span style="flex: 1; font-size: 0.85rem;">${t.matricule}</span>
                                <span style="font-weight: bold; color: ${t.result >= 0 ? '#10b981' : '#ef4444'};">${t.result.toFixed(0)} TND</span>
                            </div>
                        `).join('')}
                </div>
            </div>
        </div>
    `;
}

async function renderERPSummary() {
    const erpContainer = document.getElementById('erpSummaryContainer');
    if (!erpContainer) return;

    const range = getDateRange();
    if (!range) {
        erpContainer.innerHTML = '';
        return;
    }

    try {
        // Get orders within the date range
        const purchaseOrders = await getOrdersByDateRange(COLLECTIONS.bonCommandesAchat, range.startDate, range.endDate);
        const salesOrders = await getOrdersByDateRange(COLLECTIONS.bonCommandesVente, range.startDate, range.endDate);

        const purchaseTotal = purchaseOrders.reduce((sum, o) => sum + (o.totalTTC || o.montantTotal || 0), 0);
        const salesTotal = salesOrders.reduce((sum, o) => sum + (o.totalTTC || o.montantTotal || 0), 0);
        const margin = salesTotal - purchaseTotal;

        erpContainer.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 16px 0; color: #f59e0b;">📦 Résumé ERP — ${range.label}</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    <div class="kpi-card" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1)); border-radius: 12px; padding: 16px; text-align: center;">
                        <div style="font-size: 0.75rem; color: #94a3b8;">📥 Achats (${purchaseOrders.length} BC)</div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: #3b82f6;">${purchaseTotal.toLocaleString('fr-FR')} TND</div>
                    </div>
                    <div class="kpi-card" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1)); border-radius: 12px; padding: 16px; text-align: center;">
                        <div style="font-size: 0.75rem; color: #94a3b8;">📤 Ventes (${salesOrders.length} BC)</div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: #10b981;">${salesTotal.toLocaleString('fr-FR')} TND</div>
                    </div>
                    <div class="kpi-card" style="background: linear-gradient(135deg, ${margin >= 0 ? 'rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1)'}); border-radius: 12px; padding: 16px; text-align: center;">
                        <div style="font-size: 0.75rem; color: #94a3b8;">📈 Marge (Ventes - Achats)</div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: ${margin >= 0 ? '#10b981' : '#ef4444'};">${margin.toLocaleString('fr-FR')} TND</div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error rendering ERP summary:', error);
        erpContainer.innerHTML = '';
    }
}

async function getOrdersByDateRange(collectionName, startDate, endDate) {
    try {
        const snap = await getDocs(collection(db, collectionName));
        return snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(o => o.date && o.date >= startDate && o.date <= endDate);
    } catch (error) {
        console.error('Error getting orders by date range:', error);
        return [];
    }
}

export const ReportsModule = {
    init,
    refresh,
    populateMonthSelector,
    renderCharts,
    renderERPSummary
};

window.ReportsModule = ReportsModule;
