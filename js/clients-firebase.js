/**
 * CLIENTS MODULE - FIREBASE VERSION
 * Gestion des Clients (Vente)
 */

import { db, collection, doc, getDocs, setDoc, deleteDoc, COLLECTIONS } from './firebase.js';

let cache = [];
let _loaded = false;

async function init() {
    document.getElementById('addClientBtn')?.addEventListener('click', () => openModal());
    await loadClients();
}

async function loadClients() {
    try {
        const snap = await getDocs(collection(db, COLLECTIONS.clients));
        cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        _loaded = true;
        return cache;
    } catch (error) {
        console.error('Error loading clients:', error);
        return [];
    }
}

async function getClients() {
    if (!_loaded) await loadClients();
    return cache;
}

function getClientById(id) {
    return cache.find(c => c.id === id);
}

async function refresh() {
    await loadClients();
    await renderClients();
}

function generateCode() {
    const year = new Date().getFullYear().toString().slice(-2);
    const num = String(cache.length + 1).padStart(6, '0');
    return `CL${year}${num}`;
}

async function renderClients() {
    const clients = await getClients();
    const grid = document.getElementById('clientsGrid');
    if (!grid) return;

    if (clients.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>Aucun client. Cliquez sur + pour ajouter.</p></div>';
        return;
    }

    grid.innerHTML = clients.map(c => `
        <div class="entity-card client-card">
            <div class="entity-header">
                <div class="entity-icon">👥</div>
                <div class="entity-info">
                    <h3>${c.nom}</h3>
                    <span class="entity-badge">${c.code}</span>
                </div>
                <div class="entity-actions">
                    <button class="btn btn-sm btn-outline" onclick="ClientsModule.edit('${c.id}')">✏️</button>
                    <button class="btn btn-sm btn-outline" onclick="ClientsModule.remove('${c.id}')">🗑️</button>
                </div>
            </div>
            <div class="entity-details">
                <div class="detail-row"><span>📞</span><span>${c.telephone || '-'}</span></div>
                <div class="detail-row"><span>📧</span><span>${c.email || '-'}</span></div>
                <div class="detail-row"><span>📍</span><span>${c.adresse || '-'}</span></div>
            </div>
            <div class="entity-footer">
                <span class="solde ${c.solde >= 0 ? 'result-positive' : 'result-negative'}">
                    Solde: ${(c.solde || 0).toLocaleString('fr-FR')} TND
                </span>
            </div>
        </div>
    `).join('');
}

async function openModal(clientId = null) {
    const client = clientId ? getClientById(clientId) : null;
    const title = client ? 'Modifier Client' : 'Nouveau Client';
    const code = client?.code || generateCode();

    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = `
        <form id="clientForm">
            <input type="hidden" id="clientId" value="${client?.id || ''}">
            <div class="form-row">
                <div class="form-group">
                    <label>Code</label>
                    <input type="text" id="clientCode" value="${code}" readonly>
                </div>
                <div class="form-group">
                    <label>Nom *</label>
                    <input type="text" id="clientNom" value="${client?.nom || ''}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Téléphone</label>
                    <input type="tel" id="clientTel" value="${client?.telephone || ''}">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="clientEmail" value="${client?.email || ''}">
                </div>
            </div>
            <div class="form-group">
                <label>Adresse</label>
                <textarea id="clientAdresse" rows="2">${client?.adresse || ''}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Matricule Fiscale</label>
                    <input type="text" id="clientMF" value="${client?.matriculeFiscale || ''}" placeholder="Ex: 1234567/A/B/C/000">
                </div>
                <div class="form-group">
                    <label>RIB</label>
                    <input type="text" id="clientRib" value="${client?.rib || ''}">
                </div>
                <div class="form-group">
                    <label>Solde Initial (TND)</label>
                    <input type="number" id="clientSolde" value="${client?.solde || 0}" step="0.001">
                </div>
            </div>
        </form>
    `;
    document.getElementById('modalSave').onclick = saveClient;
    App.showModal();
}

async function saveClient() {
    const client = {
        id: document.getElementById('clientId').value || `client_${Date.now()}`,
        code: document.getElementById('clientCode').value,
        nom: document.getElementById('clientNom').value,
        telephone: document.getElementById('clientTel').value,
        email: document.getElementById('clientEmail').value,
        adresse: document.getElementById('clientAdresse').value,
        matriculeFiscale: document.getElementById('clientMF').value,
        rib: document.getElementById('clientRib').value,
        solde: parseFloat(document.getElementById('clientSolde').value) || 0,
        updatedAt: new Date().toISOString()
    };

    if (!client.nom) {
        alert('Le nom est obligatoire');
        return;
    }

    try {
        await setDoc(doc(db, COLLECTIONS.clients, client.id), client);
        App.hideModal();
        await refresh();
    } catch (error) {
        console.error('Error saving client:', error);
        alert('Erreur lors de l\'enregistrement');
    }
}

function edit(id) { openModal(id); }

async function remove(id) {
    if (confirm('Supprimer ce client ?')) {
        try {
            await deleteDoc(doc(db, COLLECTIONS.clients, id));
            await refresh();
        } catch (error) {
            console.error('Error deleting client:', error);
        }
    }
}

export const ClientsModule = { init, refresh, getClients, getClientById, edit, remove };
window.ClientsModule = ClientsModule;
