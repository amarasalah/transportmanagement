/**
 * SUPPLIERS MODULE - FIREBASE VERSION
 * Gestion des Fournisseurs (Achat Local)
 */

import { db, collection, doc, getDocs, setDoc, deleteDoc, COLLECTIONS } from './firebase.js';

let cache = [];

async function init() {
    document.getElementById('addSupplierBtn')?.addEventListener('click', () => openModal());
    await loadSuppliers();
}

async function loadSuppliers() {
    try {
        const snap = await getDocs(collection(db, COLLECTIONS.suppliers));
        cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return cache;
    } catch (error) {
        console.error('Error loading suppliers:', error);
        return [];
    }
}

async function getSuppliers() {
    if (cache.length === 0) await loadSuppliers();
    return cache;
}

function getSupplierById(id) {
    return cache.find(s => s.id === id);
}

async function refresh() {
    await loadSuppliers();
    await renderSuppliers();
}

function generateCode() {
    const year = new Date().getFullYear().toString().slice(-2);
    const num = String(cache.length + 1).padStart(6, '0');
    return `FR${year}${num}`;
}

async function renderSuppliers() {
    const suppliers = await getSuppliers();
    const grid = document.getElementById('suppliersGrid');
    if (!grid) return;

    if (suppliers.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>Aucun fournisseur. Cliquez sur + pour ajouter.</p></div>';
        return;
    }

    grid.innerHTML = suppliers.map(s => `
        <div class="entity-card supplier-card">
            <div class="entity-header">
                <div class="entity-icon">🏭</div>
                <div class="entity-info">
                    <h3>${s.nom}</h3>
                    <span class="entity-badge">${s.code}</span>
                </div>
                <div class="entity-actions">
                    <button class="btn btn-sm btn-outline" onclick="SuppliersModule.edit('${s.id}')">✏️</button>
                    <button class="btn btn-sm btn-outline" onclick="SuppliersModule.remove('${s.id}')">🗑️</button>
                </div>
            </div>
            <div class="entity-details">
                <div class="detail-row"><span>📞</span><span>${s.telephone || '-'}</span></div>
                <div class="detail-row"><span>📧</span><span>${s.email || '-'}</span></div>
                <div class="detail-row"><span>📍</span><span>${s.adresse || '-'}</span></div>
            </div>
            <div class="entity-footer">
                <span class="solde ${s.solde >= 0 ? 'result-positive' : 'result-negative'}">
                    Solde: ${(s.solde || 0).toLocaleString('fr-FR')} TND
                </span>
            </div>
        </div>
    `).join('');
}

async function openModal(supplierId = null) {
    const supplier = supplierId ? getSupplierById(supplierId) : null;
    const title = supplier ? 'Modifier Fournisseur' : 'Nouveau Fournisseur';
    const code = supplier?.code || generateCode();

    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = `
        <form id="supplierForm">
            <input type="hidden" id="supplierId" value="${supplier?.id || ''}">
            <div class="form-row">
                <div class="form-group">
                    <label>Code</label>
                    <input type="text" id="supplierCode" value="${code}" readonly>
                </div>
                <div class="form-group">
                    <label>Nom *</label>
                    <input type="text" id="supplierNom" value="${supplier?.nom || ''}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Téléphone</label>
                    <input type="tel" id="supplierTel" value="${supplier?.telephone || ''}">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="supplierEmail" value="${supplier?.email || ''}">
                </div>
            </div>
            <div class="form-group">
                <label>Adresse</label>
                <textarea id="supplierAdresse" rows="2">${supplier?.adresse || ''}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>RIB</label>
                    <input type="text" id="supplierRib" value="${supplier?.rib || ''}">
                </div>
                <div class="form-group">
                    <label>Solde Initial (TND)</label>
                    <input type="number" id="supplierSolde" value="${supplier?.solde || 0}" step="0.001">
                </div>
            </div>
        </form>
    `;
    document.getElementById('modalSave').onclick = saveSupplier;
    App.showModal();
}

async function saveSupplier() {
    const supplier = {
        id: document.getElementById('supplierId').value || `supplier_${Date.now()}`,
        code: document.getElementById('supplierCode').value,
        nom: document.getElementById('supplierNom').value,
        telephone: document.getElementById('supplierTel').value,
        email: document.getElementById('supplierEmail').value,
        adresse: document.getElementById('supplierAdresse').value,
        rib: document.getElementById('supplierRib').value,
        solde: parseFloat(document.getElementById('supplierSolde').value) || 0,
        updatedAt: new Date().toISOString()
    };

    if (!supplier.nom) {
        alert('Le nom est obligatoire');
        return;
    }

    try {
        await setDoc(doc(db, COLLECTIONS.suppliers, supplier.id), supplier);
        App.hideModal();
        await refresh();
    } catch (error) {
        console.error('Error saving supplier:', error);
        alert('Erreur lors de l\'enregistrement');
    }
}

function edit(id) { openModal(id); }

async function remove(id) {
    if (confirm('Supprimer ce fournisseur ?')) {
        try {
            await deleteDoc(doc(db, COLLECTIONS.suppliers, id));
            await refresh();
        } catch (error) {
            console.error('Error deleting supplier:', error);
        }
    }
}

export const SuppliersModule = { init, refresh, getSuppliers, getSupplierById, edit, remove };
window.SuppliersModule = SuppliersModule;
