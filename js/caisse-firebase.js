/**
 * CAISSE MODULE - FIREBASE VERSION
 * Treasury / Cash Management linked to Achat & Vente
 */

import { db, collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, COLLECTIONS } from './firebase.js';

let cache = [];
let currentFilter = 'all'; // all | encaissement | decaissement

function init() {
    document.getElementById('addCaisseBtn')?.addEventListener('click', () => openModal());
    document.getElementById('caisseFilterAll')?.addEventListener('click', () => setFilter('all'));
    document.getElementById('caisseFilterIn')?.addEventListener('click', () => setFilter('encaissement'));
    document.getElementById('caisseFilterOut')?.addEventListener('click', () => setFilter('decaissement'));
}

function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.caisse-filter-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`caisseFilter${filter === 'all' ? 'All' : filter === 'encaissement' ? 'In' : 'Out'}`)?.classList.add('active');
    renderCaisse();
}

async function loadTransactions() {
    try {
        const q = query(collection(db, COLLECTIONS.caisse), orderBy('date', 'desc'));
        const snap = await getDocs(q);
        cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
        console.error('Error loading caisse:', err);
        cache = [];
    }
}

function getTransactions() { return cache; }

async function refresh() {
    await loadTransactions();
    renderCaisse();
}

function renderCaisse() {
    // KPIs
    const totalIn = cache.filter(t => t.type === 'encaissement').reduce((s, t) => s + (t.montant || 0), 0);
    const totalOut = cache.filter(t => t.type === 'decaissement').reduce((s, t) => s + (t.montant || 0), 0);
    const solde = totalIn - totalOut;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayIn = cache.filter(t => t.type === 'encaissement' && t.date === todayStr).reduce((s, t) => s + (t.montant || 0), 0);
    const todayOut = cache.filter(t => t.type === 'decaissement' && t.date === todayStr).reduce((s, t) => s + (t.montant || 0), 0);

    const kpiEl = document.getElementById('caisseKPIs');
    if (kpiEl) {
        kpiEl.innerHTML = `
            <div class="kpi-card" style="border-left:3px solid #10b981">
                <div class="kpi-value" style="color:#10b981">+${totalIn.toLocaleString('fr-FR')} TND</div>
                <div class="kpi-label">Total Encaissements</div>
            </div>
            <div class="kpi-card" style="border-left:3px solid #ef4444">
                <div class="kpi-value" style="color:#ef4444">-${totalOut.toLocaleString('fr-FR')} TND</div>
                <div class="kpi-label">Total Décaissements</div>
            </div>
            <div class="kpi-card" style="border-left:3px solid ${solde >= 0 ? '#3b82f6' : '#f59e0b'}">
                <div class="kpi-value" style="color:${solde >= 0 ? '#3b82f6' : '#f59e0b'}">${solde.toLocaleString('fr-FR')} TND</div>
                <div class="kpi-label">Solde</div>
            </div>
            <div class="kpi-card" style="border-left:3px solid #8b5cf6">
                <div class="kpi-value" style="color:#8b5cf6">${cache.length}</div>
                <div class="kpi-label">Transactions</div>
            </div>
        `;
    }

    // Today summary
    const todaySummary = document.getElementById('caisseTodaySummary');
    if (todaySummary) {
        todaySummary.innerHTML = `
            <span style="color:#10b981;font-weight:600">↗ Aujourd'hui: +${todayIn.toLocaleString('fr-FR')} TND</span>
            <span style="margin:0 12px;color:#475569">|</span>
            <span style="color:#ef4444;font-weight:600">↘ Aujourd'hui: -${todayOut.toLocaleString('fr-FR')} TND</span>
        `;
    }

    // Table
    const filtered = currentFilter === 'all' ? cache : cache.filter(t => t.type === currentFilter);
    const tbody = document.getElementById('caisseTableBody');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#64748b;padding:40px">Aucune transaction</td></tr>';
        return;
    }

    let runSolde = 0;
    // Calc running balance (from oldest to newest)
    const sorted = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date));
    sorted.forEach(t => {
        if (t.type === 'encaissement') runSolde += (t.montant || 0);
        else runSolde -= (t.montant || 0);
        t._runSolde = runSolde;
    });

    tbody.innerHTML = filtered.map(t => {
        const isIn = t.type === 'encaissement';
        const typeIcon = isIn ? '↗' : '↘';
        const typeColor = isIn ? '#10b981' : '#ef4444';
        const typeLabel = isIn ? 'Encaissement' : 'Décaissement';
        const modeLabels = { especes: '💵 Espèces', cheque: '🏦 Chèque', virement: '🔄 Virement', carte: '💳 Carte' };

        return `<tr>
            <td>${formatDate(t.date)}</td>
            <td><span style="color:${typeColor};font-weight:700">${typeIcon} ${typeLabel}</span></td>
            <td><strong>${t.tiers || '-'}</strong></td>
            <td style="color:${typeColor};font-weight:700">${isIn ? '+' : '-'}${(t.montant || 0).toLocaleString('fr-FR')} TND</td>
            <td>${modeLabels[t.mode] || t.mode || '-'}</td>
            <td>${t.reference || '-'}</td>
            <td style="font-size:12px;color:#94a3b8">${t.notes || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="CaisseModule.edit('${t.id}')">✏️</button>
                <button class="btn btn-sm btn-outline" onclick="CaisseModule.remove('${t.id}')">🗑️</button>
            </td>
        </tr>`;
    }).join('');
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function openModal(txId = null) {
    const tx = txId ? cache.find(t => t.id === txId) : null;

    const modal = document.getElementById('modal');
    const overlay = document.getElementById('modalOverlay');
    if (!modal || !overlay) return;

    modal.innerHTML = `
        <div class="modal-header">
            <h2>${tx ? '✏️ Modifier' : '➕ Nouvelle'} Transaction</h2>
            <button class="modal-close" onclick="document.getElementById('modalOverlay').classList.remove('active')">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form-grid">
                <div class="form-group">
                    <label>Date</label>
                    <input type="date" id="txDate" value="${tx?.date || new Date().toISOString().split('T')[0]}" class="form-control">
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select id="txType" class="form-control">
                        <option value="encaissement" ${tx?.type === 'encaissement' ? 'selected' : ''}>↗ Encaissement (Entrée)</option>
                        <option value="decaissement" ${tx?.type === 'decaissement' ? 'selected' : ''}>↘ Décaissement (Sortie)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Tiers (Client / Fournisseur)</label>
                    <input type="text" id="txTiers" value="${tx?.tiers || ''}" placeholder="Nom du tiers" class="form-control">
                </div>
                <div class="form-group">
                    <label>Montant (TND)</label>
                    <input type="number" id="txMontant" value="${tx?.montant || ''}" placeholder="0.000" step="0.001" class="form-control">
                </div>
                <div class="form-group">
                    <label>Mode de Paiement</label>
                    <select id="txMode" class="form-control">
                        <option value="especes" ${tx?.mode === 'especes' ? 'selected' : ''}>💵 Espèces</option>
                        <option value="cheque" ${tx?.mode === 'cheque' ? 'selected' : ''}>🏦 Chèque</option>
                        <option value="virement" ${tx?.mode === 'virement' ? 'selected' : ''}>🔄 Virement</option>
                        <option value="carte" ${tx?.mode === 'carte' ? 'selected' : ''}>💳 Carte</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Référence (N° Facture / Chèque)</label>
                    <input type="text" id="txReference" value="${tx?.reference || ''}" placeholder="Ex: FAC-2025-001" class="form-control">
                </div>
                <div class="form-group" style="grid-column:1/-1">
                    <label>Notes</label>
                    <textarea id="txNotes" rows="2" placeholder="Notes optionnelles..." class="form-control">${tx?.notes || ''}</textarea>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" onclick="document.getElementById('modalOverlay').classList.remove('active')">Annuler</button>
            <button class="btn btn-primary" onclick="CaisseModule.save('${txId || ''}')">💾 Enregistrer</button>
        </div>
    `;

    overlay.classList.add('active');
}

async function save(txId) {
    const data = {
        date: document.getElementById('txDate')?.value || new Date().toISOString().split('T')[0],
        type: document.getElementById('txType')?.value || 'encaissement',
        tiers: document.getElementById('txTiers')?.value?.trim() || '',
        montant: parseFloat(document.getElementById('txMontant')?.value) || 0,
        mode: document.getElementById('txMode')?.value || 'especes',
        reference: document.getElementById('txReference')?.value?.trim() || '',
        notes: document.getElementById('txNotes')?.value?.trim() || '',
        updatedAt: new Date().toISOString()
    };

    if (!data.montant || data.montant <= 0) {
        alert('Le montant doit être supérieur à 0');
        return;
    }

    try {
        const id = txId || `TX-${Date.now()}`;
        if (!txId) data.createdAt = new Date().toISOString();
        await setDoc(doc(db, COLLECTIONS.caisse, id), data);
        document.getElementById('modalOverlay')?.classList.remove('active');
        await refresh();
    } catch (err) {
        console.error('Error saving transaction:', err);
        alert('Erreur lors de l\'enregistrement');
    }
}

function edit(id) { openModal(id); }

async function remove(id) {
    if (!confirm('Supprimer cette transaction ?')) return;
    try {
        await deleteDoc(doc(db, COLLECTIONS.caisse, id));
        await refresh();
    } catch (err) {
        console.error('Error deleting transaction:', err);
    }
}

export const CaisseModule = {
    init, refresh, getTransactions, edit, remove, save, setFilter
};
window.CaisseModule = CaisseModule;
