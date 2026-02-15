/**
 * ACHAT LOCAL MODULE - FIREBASE VERSION
 * UI module for procurement management
 * Linked workflow: Demande d'Achat → BC → BL → Factures
 */

import { SuppliersModule } from './suppliers-firebase.js';
import { DataModule } from './data-firebase.js';

let currentPage = '';

function init() {
    // Use event delegation for reliable button handling
    document.addEventListener('click', (e) => {
        const target = e.target;
        const btn = target.closest('button');

        // Handle Achat module buttons
        if (btn && (btn.id === 'addDemandeBtn')) {
            e.preventDefault();
            e.stopPropagation();
            openDemandeModal();
        } else if (btn && (btn.id === 'addCommandeBtn')) {
            e.preventDefault();
            e.stopPropagation();
            openCommandeModal();
        } else if (btn && (btn.id === 'addLivraisonBtn')) {
            e.preventDefault();
            e.stopPropagation();
            openLivraisonModal();
        } else if (btn && (btn.id === 'addFactureBtn')) {
            e.preventDefault();
            e.stopPropagation();
            openFactureModal();
        }
    });
}

function showPage(page) {
    currentPage = page;
    refreshCurrentPage();
}

async function refreshCurrentPage() {
    await SuppliersModule.reloadAll();
    switch (currentPage) {
        case 'offres-prix': await renderDemandes(); break;
        case 'bon-commandes': await renderCommandes(); break;
        case 'bon-livraisons': await renderLivraisons(); break;
        case 'factures': await renderFactures(); break;
        case 'reglements': await renderReglements(); break;
        case 'fournisseurs': await SuppliersModule.refresh(); break;
    }
}

// ==================== DEMANDES D'ACHAT ====================
async function renderDemandes() {
    const demandes = await SuppliersModule.getDemandes();
    const container = document.getElementById('offresContent') || document.querySelector('#page-offres-prix .page-content');
    const tbody = document.getElementById('offresBody');
    if (!tbody) return;

    if (demandes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#64748b;padding:30px">Aucune demande d\'achat</td></tr>';
        return;
    }

    const allTrucks = DataModule.getTrucks ? (await DataModule.getTrucks()) : [];

    tbody.innerHTML = demandes.map(d => {
        const fournisseur = SuppliersModule.getSupplierById(d.fournisseurId);
        const truck = allTrucks.find(t => t.id === d.camionId);
        const total = (d.lignes || []).reduce((sum, l) => sum + (l.prixTotal || 0), 0);
        const nbLignes = (d.lignes || []).length;

        return `
            <tr>
                <td><strong>${d.numero || d.id}</strong></td>
                <td>${d.date || '-'}</td>
                <td>${fournisseur?.nom || '-'}</td>
                <td>${truck?.matricule || '-'}</td>
                <td>${nbLignes} article(s)</td>
                <td><strong>${total.toFixed(3)} TND</strong></td>
                <td><span class="status-badge status-${(d.statut || '').toLowerCase().replace(/\s/g, '-').replace(/é/g, 'e')}">${d.statut || 'Brouillon'}</span></td>
                <td>
                    <button class="btn-icon" onclick="AchatModule.editDemande('${d.id}')">✏️</button>
                    <button class="btn-icon" onclick="AchatModule.deleteDemande('${d.id}')">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function openDemandeModal(demandeId = null) {
    const demande = demandeId ? SuppliersModule.getDemandeById(demandeId) : null;
    const suppliers = await SuppliersModule.getSuppliers();
    const trucks = DataModule.getTrucks ? (await DataModule.getTrucks()) : [];

    const supplierOpts = suppliers.map(s =>
        `<option value="${s.id}" ${demande?.fournisseurId === s.id ? 'selected' : ''}>${s.nom}</option>`
    ).join('');

    const truckOpts = trucks.map(t =>
        `<option value="${t.id}" ${demande?.camionId === t.id ? 'selected' : ''}>${t.matricule} (${t.type || ''})</option>`
    ).join('');

    const lignes = demande?.lignes || [{ nom: '', prixUnitaire: 0, quantite: 1, prixTotal: 0 }];

    document.getElementById('modalTitle').textContent = demande ? 'Modifier Demande d\'Achat' : 'Nouvelle Demande d\'Achat';
    document.getElementById('modalBody').innerHTML = `
        <form id="demandeForm">
            <input type="hidden" id="demandeId" value="${demande?.id || ''}">
            <div class="form-row">
                <div class="form-group">
                    <label>Date</label>
                    <input type="date" id="demandeDate" value="${demande?.date || new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group">
                    <label>Statut</label>
                    <select id="demandeStatut">
                        <option value="Brouillon" ${demande?.statut === 'Brouillon' ? 'selected' : ''}>Brouillon</option>
                        <option value="En cours" ${demande?.statut === 'En cours' ? 'selected' : ''}>En cours</option>
                        <option value="Validée" ${demande?.statut === 'Validée' ? 'selected' : ''}>Validée</option>
                        <option value="Rejetée" ${demande?.statut === 'Rejetée' ? 'selected' : ''}>Rejetée</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Fournisseur</label>
                    <select id="demandeFournisseur" required>
                        <option value="">-- Sélectionner --</option>
                        ${supplierOpts}
                    </select>
                </div>
                <div class="form-group">
                    <label>Camion</label>
                    <select id="demandeCamion">
                        <option value="">-- Optionnel --</option>
                        ${truckOpts}
                    </select>
                </div>
            </div>
            <div style="margin-top:16px">
                <label style="font-weight:600;margin-bottom:8px;display:block">📦 Articles</label>
                <table style="width:100%;border-collapse:collapse;font-size:13px" id="demandeLignesTable">
                    <thead>
                        <tr style="background:rgba(148,163,184,0.1)">
                            <th style="padding:8px;text-align:left">Nom</th>
                            <th style="padding:8px;text-align:right;width:120px">Prix Unit.</th>
                            <th style="padding:8px;text-align:right;width:80px">Qté</th>
                            <th style="padding:8px;text-align:right;width:120px">Total</th>
                            <th style="padding:8px;width:40px"></th>
                        </tr>
                    </thead>
                    <tbody id="demandeLignesBody">
                        ${lignes.map((l, i) => renderLigneRow(i, l)).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="border-top:2px solid rgba(148,163,184,0.2)">
                            <td colspan="3" style="padding:8px;text-align:right;font-weight:700">Total Général:</td>
                            <td style="padding:8px;text-align:right;font-weight:700;font-size:15px" id="demandeTotalGeneral">0.000 TND</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
                <button type="button" onclick="AchatModule.addLigne()" 
                    style="margin-top:8px;padding:6px 14px;background:rgba(99,102,241,0.15);color:#818cf8;border:1px dashed #818cf8;border-radius:6px;cursor:pointer;font-size:12px">
                    ➕ Ajouter une ligne
                </button>
            </div>
        </form>
    `;
    recalcTotal();
    document.getElementById('modalSave').onclick = saveDemande;
    App.showModal();
}

function renderLigneRow(index, ligne = {}) {
    return `
        <tr data-ligne="${index}">
            <td style="padding:4px"><input type="text" class="ligne-nom" value="${ligne.nom || ''}" placeholder="Nom article" style="width:100%;padding:6px;background:rgba(15,23,42,0.3);border:1px solid rgba(148,163,184,0.2);border-radius:4px;color:#f1f5f9;font-size:13px"></td>
            <td style="padding:4px"><input type="number" class="ligne-pu" value="${ligne.prixUnitaire || 0}" step="0.001" min="0" onchange="AchatModule.recalcLigne(this)" style="width:100%;padding:6px;text-align:right;background:rgba(15,23,42,0.3);border:1px solid rgba(148,163,184,0.2);border-radius:4px;color:#f1f5f9;font-size:13px"></td>
            <td style="padding:4px"><input type="number" class="ligne-qte" value="${ligne.quantite || 1}" min="1" onchange="AchatModule.recalcLigne(this)" style="width:100%;padding:6px;text-align:right;background:rgba(15,23,42,0.3);border:1px solid rgba(148,163,184,0.2);border-radius:4px;color:#f1f5f9;font-size:13px"></td>
            <td style="padding:4px"><input type="number" class="ligne-total" value="${ligne.prixTotal || 0}" step="0.001" readonly style="width:100%;padding:6px;text-align:right;background:rgba(15,23,42,0.15);border:1px solid rgba(148,163,184,0.1);border-radius:4px;color:#10b981;font-weight:600;font-size:13px"></td>
            <td style="padding:4px;text-align:center"><button type="button" onclick="AchatModule.removeLigne(this)" style="background:none;border:none;cursor:pointer;font-size:16px;color:#ef4444">🗑️</button></td>
        </tr>
    `;
}

function addLigne() {
    const tbody = document.getElementById('demandeLignesBody');
    if (!tbody) return;
    const index = tbody.children.length;
    tbody.insertAdjacentHTML('beforeend', renderLigneRow(index));
}

function removeLigne(btn) {
    const row = btn.closest('tr');
    if (document.getElementById('demandeLignesBody').children.length <= 1) return;
    row.remove();
    recalcTotal();
}

function recalcLigne(input) {
    const row = input.closest('tr');
    const pu = parseFloat(row.querySelector('.ligne-pu').value) || 0;
    const qte = parseFloat(row.querySelector('.ligne-qte').value) || 0;
    row.querySelector('.ligne-total').value = (pu * qte).toFixed(3);
    recalcTotal();
}

function recalcTotal() {
    const totals = document.querySelectorAll('#demandeLignesBody .ligne-total');
    let grand = 0;
    totals.forEach(t => grand += parseFloat(t.value) || 0);
    const el = document.getElementById('demandeTotalGeneral');
    if (el) el.textContent = grand.toFixed(3) + ' TND';
}

function getLignesFromForm() {
    const rows = document.querySelectorAll('#demandeLignesBody tr');
    return Array.from(rows).map(row => ({
        nom: row.querySelector('.ligne-nom')?.value || '',
        prixUnitaire: parseFloat(row.querySelector('.ligne-pu')?.value) || 0,
        quantite: parseFloat(row.querySelector('.ligne-qte')?.value) || 0,
        prixTotal: parseFloat(row.querySelector('.ligne-total')?.value) || 0
    })).filter(l => l.nom.trim());
}

async function saveDemande() {
    const lignes = getLignesFromForm();
    if (lignes.length === 0) { alert('Ajoutez au moins un article'); return; }

    const demande = {
        id: document.getElementById('demandeId').value || null,
        numero: document.getElementById('demandeId').value ? SuppliersModule.getDemandeById(document.getElementById('demandeId').value)?.numero : `DA-${Date.now().toString().slice(-6)}`,
        date: document.getElementById('demandeDate').value,
        fournisseurId: document.getElementById('demandeFournisseur').value,
        camionId: document.getElementById('demandeCamion').value || null,
        statut: document.getElementById('demandeStatut').value,
        lignes: lignes,
        montantTotal: lignes.reduce((s, l) => s + l.prixTotal, 0)
    };

    if (!demande.fournisseurId) { alert('Sélectionnez un fournisseur'); return; }

    try {
        await SuppliersModule.saveDemande(demande);
        App.hideModal();
        await renderDemandes();
    } catch (err) {
        console.error('Erreur sauvegarde DA:', err);
        alert('Erreur: ' + err.message);
    }
}

function editDemande(id) { openDemandeModal(id); }
async function deleteDemande(id) {
    if (confirm('Supprimer cette demande d\'achat?')) {
        await SuppliersModule.deleteDemande(id);
        await renderDemandes();
    }
}

// ==================== BON COMMANDES ====================
async function renderCommandes() {
    const commandes = await SuppliersModule.getCommandes();
    const tbody = document.getElementById('commandesBody');
    if (!tbody) return;

    if (commandes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;padding:30px">Aucun bon de commande</td></tr>';
        return;
    }

    tbody.innerHTML = commandes.map(c => {
        const fournisseur = SuppliersModule.getSupplierById(c.fournisseurId);
        const total = (c.lignes || []).reduce((sum, l) => sum + (l.prixTotal || 0), 0);
        return `
            <tr>
                <td><strong>${c.numero || c.id}</strong></td>
                <td>${c.date || '-'}</td>
                <td>${c.demandeNumero || '-'}</td>
                <td>${fournisseur?.nom || '-'}</td>
                <td>${(c.lignes || []).length} article(s)</td>
                <td><strong>${total.toFixed(3)} TND</strong></td>
                <td><span class="status-badge status-${(c.statut || '').toLowerCase().replace(/\s/g, '-')}">${c.statut || 'En cours'}</span></td>
                <td>
                    <button class="btn-icon" onclick="AchatModule.editCommande('${c.id}')">✏️</button>
                    <button class="btn-icon" onclick="AchatModule.deleteCommande('${c.id}')">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function openCommandeModal(commandeId = null) {
    const commande = commandeId ? SuppliersModule.getCommandeById(commandeId) : null;
    const demandes = await SuppliersModule.getDemandes();
    const validDemandes = demandes.filter(d => d.statut === 'Validée' || d.id === commande?.demandeId);

    const demandeOpts = validDemandes.map(d => {
        const f = SuppliersModule.getSupplierById(d.fournisseurId);
        return `<option value="${d.id}" ${commande?.demandeId === d.id ? 'selected' : ''}>${d.numero || d.id} - ${f?.nom || ''} (${d.montantTotal?.toFixed(3) || 0} TND)</option>`;
    }).join('');

    const lignes = commande?.lignes || [];

    document.getElementById('modalTitle').textContent = commande ? 'Modifier Bon Commande' : 'Nouveau Bon Commande';
    document.getElementById('modalBody').innerHTML = `
        <form id="commandeForm">
            <input type="hidden" id="commandeId" value="${commande?.id || ''}">
            <div class="form-row">
                <div class="form-group">
                    <label>Demande d'Achat source</label>
                    <select id="commandeDemandeId" onchange="AchatModule.onDemandeChange()" ${commande ? 'disabled' : ''} required>
                        <option value="">-- Sélectionner une DA --</option>
                        ${demandeOpts}
                    </select>
                </div>
                <div class="form-group">
                    <label>Date BC</label>
                    <input type="date" id="commandeDate" value="${commande?.date || new Date().toISOString().split('T')[0]}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Fournisseur</label>
                    <input type="text" id="commandeFournisseurNom" value="${commande?.fournisseurId ? SuppliersModule.getSupplierById(commande.fournisseurId)?.nom || '' : ''}" readonly style="background:rgba(15,23,42,0.2)">
                    <input type="hidden" id="commandeFournisseurId" value="${commande?.fournisseurId || ''}">
                </div>
                <div class="form-group">
                    <label>Camion</label>
                    <input type="text" id="commandeCamionNom" value="${commande?.camionId || ''}" readonly style="background:rgba(15,23,42,0.2)">
                    <input type="hidden" id="commandeCamionId" value="${commande?.camionId || ''}">
                </div>
            </div>
            <div style="margin-top:16px">
                <label style="font-weight:600;margin-bottom:8px;display:block">📦 Articles (prix modifiables)</label>
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                    <thead>
                        <tr style="background:rgba(148,163,184,0.1)">
                            <th style="padding:8px;text-align:left">Nom</th>
                            <th style="padding:8px;text-align:right;width:120px">Prix Unit.</th>
                            <th style="padding:8px;text-align:right;width:80px">Qté</th>
                            <th style="padding:8px;text-align:right;width:120px">Total</th>
                        </tr>
                    </thead>
                    <tbody id="commandeLignesBody">
                        ${lignes.map((l, i) => `
                            <tr>
                                <td style="padding:6px;color:#f1f5f9">${l.nom}</td>
                                <td style="padding:4px"><input type="number" class="cmd-pu" value="${l.prixUnitaire}" step="0.001" onchange="AchatModule.recalcCmdLigne(this)" style="width:100%;padding:6px;text-align:right;background:rgba(15,23,42,0.3);border:1px solid rgba(148,163,184,0.2);border-radius:4px;color:#f1f5f9;font-size:13px"></td>
                                <td style="padding:6px;text-align:right;color:#94a3b8">${l.quantite}</td>
                                <td style="padding:6px;text-align:right;font-weight:600;color:#10b981" class="cmd-total">${(l.prixTotal || 0).toFixed(3)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="border-top:2px solid rgba(148,163,184,0.2)">
                            <td colspan="3" style="padding:8px;text-align:right;font-weight:700">Total:</td>
                            <td style="padding:8px;text-align:right;font-weight:700;font-size:15px;color:#10b981" id="commandeTotalGeneral">${lignes.reduce((s, l) => s + (l.prixTotal || 0), 0).toFixed(3)} TND</td>
                        </tr>
                    </tfoot>
                </table>
                ${lignes.length === 0 ? '<div style="color:#64748b;padding:20px;text-align:center;font-size:13px">Sélectionnez une Demande d\'Achat pour charger les articles</div>' : ''}
            </div>
        </form>
    `;
    document.getElementById('modalSave').onclick = saveCommande;
    App.showModal();
}

function onDemandeChange() {
    const daId = document.getElementById('commandeDemandeId')?.value;
    if (!daId) return;
    const demande = SuppliersModule.getDemandeById(daId);
    if (!demande) return;

    // Fill fournisseur & camion
    const f = SuppliersModule.getSupplierById(demande.fournisseurId);
    document.getElementById('commandeFournisseurNom').value = f?.nom || '';
    document.getElementById('commandeFournisseurId').value = demande.fournisseurId || '';
    document.getElementById('commandeCamionId').value = demande.camionId || '';

    const trucks = DataModule.getTrucks ? DataModule.getTrucks() : [];
    const truck = trucks.find(t => t.id === demande.camionId);
    document.getElementById('commandeCamionNom').value = truck?.matricule || demande.camionId || '';

    // Fill lignes
    const lignes = demande.lignes || [];
    const tbody = document.getElementById('commandeLignesBody');
    tbody.innerHTML = lignes.map(l => `
        <tr>
            <td style="padding:6px;color:#f1f5f9">${l.nom}</td>
            <td style="padding:4px"><input type="number" class="cmd-pu" value="${l.prixUnitaire}" step="0.001" onchange="AchatModule.recalcCmdLigne(this)" style="width:100%;padding:6px;text-align:right;background:rgba(15,23,42,0.3);border:1px solid rgba(148,163,184,0.2);border-radius:4px;color:#f1f5f9;font-size:13px"></td>
            <td style="padding:6px;text-align:right;color:#94a3b8">${l.quantite}</td>
            <td style="padding:6px;text-align:right;font-weight:600;color:#10b981" class="cmd-total">${(l.prixTotal || 0).toFixed(3)}</td>
        </tr>
    `).join('');
    recalcCmdTotal();
}

function recalcCmdLigne(input) {
    const row = input.closest('tr');
    const pu = parseFloat(row.querySelector('.cmd-pu').value) || 0;
    const qte = parseFloat(row.querySelector('td:nth-child(3)').textContent) || 0;
    row.querySelector('.cmd-total').textContent = (pu * qte).toFixed(3);
    recalcCmdTotal();
}

function recalcCmdTotal() {
    const totals = document.querySelectorAll('#commandeLignesBody .cmd-total');
    let grand = 0;
    totals.forEach(t => grand += parseFloat(t.textContent) || 0);
    const el = document.getElementById('commandeTotalGeneral');
    if (el) el.textContent = grand.toFixed(3) + ' TND';
}

async function saveCommande() {
    const daId = document.getElementById('commandeDemandeId')?.value;
    const demande = daId ? SuppliersModule.getDemandeById(daId) : null;

    // Get lignes from table
    const rows = document.querySelectorAll('#commandeLignesBody tr');
    const lignes = Array.from(rows).map(row => {
        const nom = row.querySelector('td:first-child').textContent.trim();
        const pu = parseFloat(row.querySelector('.cmd-pu')?.value) || 0;
        const qte = parseFloat(row.querySelector('td:nth-child(3)').textContent) || 0;
        return { nom, prixUnitaire: pu, quantite: qte, prixTotal: pu * qte };
    });

    if (lignes.length === 0) { alert('Aucun article'); return; }

    const commande = {
        id: document.getElementById('commandeId').value || null,
        numero: document.getElementById('commandeId').value ? SuppliersModule.getCommandeById(document.getElementById('commandeId').value)?.numero : `BC-${Date.now().toString().slice(-6)}`,
        date: document.getElementById('commandeDate').value,
        demandeId: daId || null,
        demandeNumero: demande?.numero || '',
        fournisseurId: document.getElementById('commandeFournisseurId').value,
        camionId: document.getElementById('commandeCamionId').value || null,
        lignes: lignes,
        montantTotal: lignes.reduce((s, l) => s + l.prixTotal, 0),
        statut: 'En cours'
    };

    try {
        await SuppliersModule.saveCommande(commande);
        App.hideModal();
        await renderCommandes();
    } catch (err) {
        console.error('Erreur sauvegarde BC:', err);
        alert('Erreur: ' + err.message);
    }
}

function editCommande(id) { openCommandeModal(id); }
async function deleteCommande(id) {
    if (confirm('Supprimer ce bon de commande?')) {
        await SuppliersModule.deleteCommande(id);
        await renderCommandes();
    }
}

// ==================== BON LIVRAISONS ====================
async function renderLivraisons() {
    const livraisons = await SuppliersModule.getLivraisons();
    const tbody = document.getElementById('livraisonsBody');
    if (!tbody) return;

    if (livraisons.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;padding:30px">Aucun bon de livraison</td></tr>';
        return;
    }

    tbody.innerHTML = livraisons.map(l => {
        const fournisseur = SuppliersModule.getSupplierById(l.fournisseurId);
        return `
            <tr>
                <td><strong>${l.numero || l.id}</strong></td>
                <td>${l.date || '-'}</td>
                <td>${l.commandeNumero || '-'}</td>
                <td>${fournisseur?.nom || '-'}</td>
                <td>${(l.lignes || []).length} article(s)</td>
                <td><span class="status-badge status-${(l.statut || '').toLowerCase()}">${l.statut || 'Reçu'}</span></td>
                <td>
                    <button class="btn-icon" onclick="AchatModule.editLivraison('${l.id}')">✏️</button>
                    <button class="btn-icon" onclick="AchatModule.deleteLivraison('${l.id}')">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function openLivraisonModal(livraisonId = null) {
    const livraison = livraisonId ? SuppliersModule.getLivraisonById(livraisonId) : null;
    const commandes = await SuppliersModule.getCommandes();
    const activeCmds = commandes.filter(c => c.statut === 'En cours' || c.statut === 'Partiellement livré' || c.id === livraison?.commandeId);

    const cmdOpts = activeCmds.map(c => {
        const f = SuppliersModule.getSupplierById(c.fournisseurId);
        return `<option value="${c.id}" ${livraison?.commandeId === c.id ? 'selected' : ''}>${c.numero || c.id} - ${f?.nom || ''} (${c.montantTotal?.toFixed(3) || 0} TND)</option>`;
    }).join('');

    const lignes = livraison?.lignes || [];

    document.getElementById('modalTitle').textContent = livraison ? 'Modifier Bon Livraison' : 'Nouveau Bon Livraison';
    document.getElementById('modalBody').innerHTML = `
        <form id="livraisonForm">
            <input type="hidden" id="livraisonId" value="${livraison?.id || ''}">
            <div class="form-row">
                <div class="form-group">
                    <label>Bon Commande source</label>
                    <select id="livraisonCommandeId" onchange="AchatModule.onCommandeChangeBL()" ${livraison ? 'disabled' : ''} required>
                        <option value="">-- Sélectionner un BC --</option>
                        ${cmdOpts}
                    </select>
                </div>
                <div class="form-group">
                    <label>Date Réception</label>
                    <input type="date" id="livraisonDate" value="${livraison?.date || new Date().toISOString().split('T')[0]}" required>
                </div>
            </div>
            <div class="form-group">
                <label>Dépôt</label>
                <select id="livraisonDepot">
                    <option value="Magasin principal" ${livraison?.depot === 'Magasin principal' ? 'selected' : ''}>Magasin principal</option>
                    <option value="Silos S2" ${livraison?.depot === 'Silos S2' ? 'selected' : ''}>Silos S2</option>
                </select>
            </div>
            <div style="margin-top:16px">
                <label style="font-weight:600;margin-bottom:8px;display:block">📦 Articles reçus</label>
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                    <thead>
                        <tr style="background:rgba(148,163,184,0.1)">
                            <th style="padding:8px;text-align:left">Nom</th>
                            <th style="padding:8px;text-align:right;width:100px">Commandé</th>
                            <th style="padding:8px;text-align:right;width:100px">Déjà reçu</th>
                            <th style="padding:8px;text-align:right;width:120px">Qté reçue</th>
                        </tr>
                    </thead>
                    <tbody id="livraisonLignesBody">
                        ${lignes.map(l => `
                            <tr>
                                <td style="padding:6px;color:#f1f5f9">${l.nom}</td>
                                <td style="padding:6px;text-align:right;color:#94a3b8">${l.quantiteCommandee || 0}</td>
                                <td style="padding:6px;text-align:right;color:#64748b">${l.dejaRecu || 0}</td>
                                <td style="padding:4px"><input type="number" class="bl-qte" value="${l.quantiteRecue || 0}" min="0" max="${(l.quantiteCommandee || 0) - (l.dejaRecu || 0)}" style="width:100%;padding:6px;text-align:right;background:rgba(15,23,42,0.3);border:1px solid rgba(148,163,184,0.2);border-radius:4px;color:#f1f5f9;font-size:13px"></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${lignes.length === 0 ? '<div style="color:#64748b;padding:20px;text-align:center;font-size:13px">Sélectionnez un Bon Commande pour charger les articles</div>' : ''}
            </div>
        </form>
    `;
    document.getElementById('modalSave').onclick = saveLivraison;
    App.showModal();
}

async function onCommandeChangeBL() {
    const bcId = document.getElementById('livraisonCommandeId')?.value;
    if (!bcId) return;
    const commande = SuppliersModule.getCommandeById(bcId);
    if (!commande) return;

    // Get existing BLs for this BC
    const allBLs = await SuppliersModule.getLivraisons();
    const existingBLs = allBLs.filter(bl => bl.commandeId === bcId);

    const tbody = document.getElementById('livraisonLignesBody');
    tbody.innerHTML = (commande.lignes || []).map(l => {
        // Calculate already delivered qty
        let dejaRecu = 0;
        existingBLs.forEach(bl => {
            const blLine = (bl.lignes || []).find(bll => bll.nom === l.nom);
            if (blLine) dejaRecu += (blLine.quantiteRecue || 0);
        });
        const restant = Math.max(0, l.quantite - dejaRecu);

        return `
            <tr>
                <td style="padding:6px;color:#f1f5f9">${l.nom}</td>
                <td style="padding:6px;text-align:right;color:#94a3b8">${l.quantite}</td>
                <td style="padding:6px;text-align:right;color:#64748b">${dejaRecu}</td>
                <td style="padding:4px"><input type="number" class="bl-qte" value="${restant}" min="0" max="${restant}" style="width:100%;padding:6px;text-align:right;background:rgba(15,23,42,0.3);border:1px solid rgba(148,163,184,0.2);border-radius:4px;color:#f1f5f9;font-size:13px"></td>
            </tr>
        `;
    }).join('');
}

async function saveLivraison() {
    const bcId = document.getElementById('livraisonCommandeId')?.value;
    const commande = bcId ? SuppliersModule.getCommandeById(bcId) : null;

    const rows = document.querySelectorAll('#livraisonLignesBody tr');
    const lignes = Array.from(rows).map(row => ({
        nom: row.querySelector('td:first-child').textContent.trim(),
        quantiteCommandee: parseFloat(row.querySelector('td:nth-child(2)').textContent) || 0,
        dejaRecu: parseFloat(row.querySelector('td:nth-child(3)').textContent) || 0,
        quantiteRecue: parseFloat(row.querySelector('.bl-qte')?.value) || 0
    })).filter(l => l.quantiteRecue > 0);

    if (lignes.length === 0) { alert('Aucune quantité reçue'); return; }

    const livraison = {
        id: document.getElementById('livraisonId').value || null,
        numero: document.getElementById('livraisonId').value ? SuppliersModule.getLivraisonById(document.getElementById('livraisonId').value)?.numero : `BL-${Date.now().toString().slice(-6)}`,
        date: document.getElementById('livraisonDate').value,
        commandeId: bcId || null,
        commandeNumero: commande?.numero || '',
        fournisseurId: commande?.fournisseurId || '',
        depot: document.getElementById('livraisonDepot').value,
        lignes: lignes,
        statut: 'Reçu'
    };

    try {
        await SuppliersModule.saveLivraison(livraison);
        // Update BC status
        if (commande) {
            const allBLs = await SuppliersModule.getLivraisons();
            const bcBLs = allBLs.filter(bl => bl.commandeId === bcId);
            const cmdLignes = commande.lignes || [];
            let allDelivered = true;
            cmdLignes.forEach(cl => {
                let totalRecu = 0;
                bcBLs.forEach(bl => {
                    const bll = (bl.lignes || []).find(x => x.nom === cl.nom);
                    if (bll) totalRecu += bll.quantiteRecue || 0;
                });
                if (totalRecu < cl.quantite) allDelivered = false;
            });
            commande.statut = allDelivered ? 'Livré' : 'Partiellement livré';
            await SuppliersModule.saveCommande(commande);
        }
        App.hideModal();
        await renderLivraisons();
    } catch (err) {
        console.error('Erreur sauvegarde BL:', err);
        alert('Erreur: ' + err.message);
    }
}

function editLivraison(id) { openLivraisonModal(id); }
async function deleteLivraison(id) {
    if (confirm('Supprimer ce bon de livraison?')) {
        await SuppliersModule.deleteLivraison(id);
        await renderLivraisons();
    }
}

// ==================== FACTURES ====================
async function renderFactures() {
    const factures = await SuppliersModule.getFactures();
    const tbody = document.getElementById('facturesBody');
    if (!tbody) return;

    let totalNonPaye = 0;
    let totalPaye = 0;

    if (factures.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#64748b;padding:30px">Aucune facture</td></tr>';
    } else {
        tbody.innerHTML = factures.map(f => {
            const fournisseur = SuppliersModule.getSupplierById(f.fournisseurId);
            const montant = parseFloat(f.montantTotal) || 0;
            const echeances = f.echeances || [];
            const paye = echeances.filter(e => e.statut === 'Payé').reduce((s, e) => s + (e.montant || 0), 0);
            const restant = montant - paye;

            if (f.etat === 'Payée') totalPaye += montant;
            else totalNonPaye += restant;

            return `
                <tr>
                    <td><strong>${f.numero || f.id}</strong></td>
                    <td>${f.date || '-'}</td>
                    <td>${f.blNumero || '-'}</td>
                    <td>${fournisseur?.nom || '-'}</td>
                    <td><strong>${montant.toFixed(3)} TND</strong></td>
                    <td>${paye.toFixed(3)} TND</td>
                    <td><span class="status-badge status-${(f.etat || '').toLowerCase().replace(/\s/g, '-').replace(/é/g, 'e')}">${f.etat || 'Non Payée'}</span></td>
                    <td>
                        <button class="btn-icon" onclick="AchatModule.editFacture('${f.id}')">✏️</button>
                        <button class="btn-icon" onclick="AchatModule.viewEcheances('${f.id}')" title="Échéances">💰</button>
                        <button class="btn-icon" onclick="AchatModule.deleteFacture('${f.id}')">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    const kpiNonPaye = document.getElementById('totalNonPaye');
    const kpiPaye = document.getElementById('totalPaye');
    if (kpiNonPaye) kpiNonPaye.textContent = totalNonPaye.toFixed(3) + ' TND';
    if (kpiPaye) kpiPaye.textContent = totalPaye.toFixed(3) + ' TND';
}

async function openFactureModal(factureId = null) {
    const facture = factureId ? SuppliersModule.getFactureById(factureId) : null;
    const livraisons = await SuppliersModule.getLivraisons();
    const activeBLs = livraisons.filter(l => l.statut === 'Reçu' || l.id === facture?.livraisonId);

    const blOpts = activeBLs.map(l => {
        const f = SuppliersModule.getSupplierById(l.fournisseurId);
        return `<option value="${l.id}" ${facture?.livraisonId === l.id ? 'selected' : ''}>${l.numero || l.id} - ${f?.nom || ''}</option>`;
    }).join('');

    const echeances = facture?.echeances || [{ date: new Date().toISOString().split('T')[0], montant: 0, typePaiement: 'Virement', statut: 'En attente' }];

    document.getElementById('modalTitle').textContent = facture ? 'Modifier Facture' : 'Nouvelle Facture Fournisseur';
    document.getElementById('modalBody').innerHTML = `
        <form id="factureForm">
            <input type="hidden" id="factureId" value="${facture?.id || ''}">
            <div class="form-row">
                <div class="form-group">
                    <label>Bon Livraison</label>
                    <select id="factureBLId" onchange="AchatModule.onBLChangeFacture()" ${facture ? 'disabled' : ''} required>
                        <option value="">-- Sélectionner un BL --</option>
                        ${blOpts}
                    </select>
                </div>
                <div class="form-group">
                    <label>Date Facture</label>
                    <input type="date" id="factureDate" value="${facture?.date || new Date().toISOString().split('T')[0]}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>N° Facture</label>
                    <input type="text" id="factureNumero" value="${facture?.numeroFournisseur || ''}" placeholder="Ex: FACT-2026-001">
                </div>
                <div class="form-group">
                    <label>Montant Total (TND)</label>
                    <input type="number" id="factureMontant" value="${facture?.montantTotal || ''}" step="0.001" required>
                </div>
            </div>
            <div style="margin-top:16px">
                <label style="font-weight:600;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between">
                    <span>💰 Échéances de paiement</span>
                    <button type="button" onclick="AchatModule.addEcheance()" 
                        style="padding:4px 12px;background:rgba(99,102,241,0.15);color:#818cf8;border:1px dashed #818cf8;border-radius:4px;cursor:pointer;font-size:11px">
                        ➕ Tranche
                    </button>
                </label>
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                    <thead>
                        <tr style="background:rgba(148,163,184,0.1)">
                            <th style="padding:8px;text-align:left">Date</th>
                            <th style="padding:8px;text-align:right;width:120px">Montant</th>
                            <th style="padding:8px;text-align:left;width:130px">Type</th>
                            <th style="padding:8px;text-align:left;width:110px">Statut</th>
                            <th style="padding:8px;width:40px"></th>
                        </tr>
                    </thead>
                    <tbody id="echeancesBody">
                        ${echeances.map((e, i) => renderEcheanceRow(i, e)).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="border-top:2px solid rgba(148,163,184,0.2)">
                            <td style="padding:8px;font-weight:700">Total échéances:</td>
                            <td style="padding:8px;text-align:right;font-weight:700" id="echeancesTotalDisplay">0.000 TND</td>
                            <td colspan="3"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </form>
    `;
    recalcEcheances();
    document.getElementById('modalSave').onclick = saveFacture;
    App.showModal();
}

function renderEcheanceRow(index, ech = {}) {
    const typeOptions = ['Virement', 'Versement', 'Traite', 'Chèque', 'Espèce'].map(t =>
        `<option value="${t}" ${ech.typePaiement === t ? 'selected' : ''}>${t}</option>`
    ).join('');

    return `
        <tr data-ech="${index}">
            <td style="padding:4px"><input type="date" class="ech-date" value="${ech.date || ''}" style="padding:6px;background:rgba(15,23,42,0.3);border:1px solid rgba(148,163,184,0.2);border-radius:4px;color:#f1f5f9;font-size:12px;width:100%"></td>
            <td style="padding:4px"><input type="number" class="ech-montant" value="${ech.montant || 0}" step="0.001" onchange="AchatModule.recalcEcheances()" style="width:100%;padding:6px;text-align:right;background:rgba(15,23,42,0.3);border:1px solid rgba(148,163,184,0.2);border-radius:4px;color:#f1f5f9;font-size:13px"></td>
            <td style="padding:4px"><select class="ech-type" style="padding:6px;background:rgba(15,23,42,0.3);border:1px solid rgba(148,163,184,0.2);border-radius:4px;color:#f1f5f9;font-size:12px;width:100%">${typeOptions}</select></td>
            <td style="padding:4px"><select class="ech-statut" style="padding:6px;background:rgba(15,23,42,0.3);border:1px solid rgba(148,163,184,0.2);border-radius:4px;color:#f1f5f9;font-size:12px;width:100%">
                <option value="En attente" ${ech.statut === 'En attente' ? 'selected' : ''}>En attente</option>
                <option value="Payé" ${ech.statut === 'Payé' ? 'selected' : ''}>Payé</option>
            </select></td>
            <td style="padding:4px;text-align:center"><button type="button" onclick="AchatModule.removeEcheance(this)" style="background:none;border:none;cursor:pointer;font-size:14px;color:#ef4444">🗑️</button></td>
        </tr>
    `;
}

function addEcheance() {
    const tbody = document.getElementById('echeancesBody');
    if (!tbody) return;
    const index = tbody.children.length;
    tbody.insertAdjacentHTML('beforeend', renderEcheanceRow(index, { date: new Date().toISOString().split('T')[0], statut: 'En attente' }));
}

function removeEcheance(btn) {
    btn.closest('tr').remove();
    recalcEcheances();
}

function recalcEcheances() {
    const amounts = document.querySelectorAll('#echeancesBody .ech-montant');
    let total = 0;
    amounts.forEach(a => total += parseFloat(a.value) || 0);
    const el = document.getElementById('echeancesTotalDisplay');
    if (el) el.textContent = total.toFixed(3) + ' TND';
}

function onBLChangeFacture() {
    const blId = document.getElementById('factureBLId')?.value;
    if (!blId) return;
    const livraison = SuppliersModule.getLivraisonById(blId);
    if (!livraison) return;
    // Can auto-fill amount from BL if needed
}

function getEcheancesFromForm() {
    const rows = document.querySelectorAll('#echeancesBody tr');
    return Array.from(rows).map(row => ({
        date: row.querySelector('.ech-date')?.value || '',
        montant: parseFloat(row.querySelector('.ech-montant')?.value) || 0,
        typePaiement: row.querySelector('.ech-type')?.value || 'Virement',
        statut: row.querySelector('.ech-statut')?.value || 'En attente'
    }));
}

async function saveFacture() {
    const echeances = getEcheancesFromForm();
    const blId = document.getElementById('factureBLId')?.value;
    const livraison = blId ? SuppliersModule.getLivraisonById(blId) : null;
    const montant = parseFloat(document.getElementById('factureMontant').value) || 0;

    const paye = echeances.filter(e => e.statut === 'Payé').reduce((s, e) => s + e.montant, 0);
    let etat = 'Non Payée';
    if (paye >= montant && montant > 0) etat = 'Payée';
    else if (paye > 0) etat = 'Partiel';

    const facture = {
        id: document.getElementById('factureId').value || null,
        numero: document.getElementById('factureId').value ? SuppliersModule.getFactureById(document.getElementById('factureId').value)?.numero : `FA-${Date.now().toString().slice(-6)}`,
        date: document.getElementById('factureDate').value,
        numeroFournisseur: document.getElementById('factureNumero').value,
        livraisonId: blId || null,
        blNumero: livraison?.numero || '',
        fournisseurId: livraison?.fournisseurId || '',
        montantTotal: montant,
        echeances: echeances,
        etat: etat
    };

    try {
        await SuppliersModule.saveFacture(facture);
        App.hideModal();
        await renderFactures();
    } catch (err) {
        console.error('Erreur sauvegarde facture:', err);
        alert('Erreur: ' + err.message);
    }
}

function editFacture(id) { openFactureModal(id); }
async function deleteFacture(id) {
    if (confirm('Supprimer cette facture?')) {
        await SuppliersModule.deleteFacture(id);
        await renderFactures();
    }
}

async function viewEcheances(factureId) {
    const facture = SuppliersModule.getFactureById(factureId);
    if (!facture) return;
    // Open in edit mode to view/manage echeances
    openFactureModal(factureId);
}

// ==================== REGLEMENTS ====================
async function renderReglements() {
    const factures = await SuppliersModule.getFactures();
    const container = document.getElementById('reglementsContent') || document.querySelector('#page-reglements');
    if (!container) return;

    // Collect all echeances across all factures
    let allEcheances = [];
    factures.forEach(f => {
        const fournisseur = SuppliersModule.getSupplierById(f.fournisseurId);
        (f.echeances || []).forEach(e => {
            allEcheances.push({
                ...e,
                factureNumero: f.numero || f.id,
                fournisseurNom: fournisseur?.nom || '-',
                factureId: f.id
            });
        });
    });

    // Sort by date
    allEcheances.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    const totalEnAttente = allEcheances.filter(e => e.statut === 'En attente').reduce((s, e) => s + (e.montant || 0), 0);
    const totalPaye = allEcheances.filter(e => e.statut === 'Payé').reduce((s, e) => s + (e.montant || 0), 0);

    const content = container.querySelector('.page-content, div') || container;
    content.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:20px">
            <div class="card" style="padding:16px;text-align:center">
                <div style="font-size:24px;font-weight:700;color:#f59e0b">${totalEnAttente.toFixed(3)} TND</div>
                <div style="font-size:12px;color:#64748b;margin-top:4px">⏳ En attente</div>
            </div>
            <div class="card" style="padding:16px;text-align:center">
                <div style="font-size:24px;font-weight:700;color:#10b981">${totalPaye.toFixed(3)} TND</div>
                <div style="font-size:12px;color:#64748b;margin-top:4px">✅ Payé</div>
            </div>
            <div class="card" style="padding:16px;text-align:center">
                <div style="font-size:24px;font-weight:700;color:#f1f5f9">${allEcheances.length}</div>
                <div style="font-size:12px;color:#64748b;margin-top:4px">📋 Total échéances</div>
            </div>
        </div>
        <div class="card" style="padding:20px">
            <h3 style="margin-bottom:16px;font-size:1rem">📋 Toutes les échéances</h3>
            <div style="overflow-x:auto">
                <table class="data-table" style="width:100%">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Facture</th>
                            <th>Fournisseur</th>
                            <th>Montant</th>
                            <th>Type</th>
                            <th>Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allEcheances.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:30px">Aucune échéance</td></tr>' :
            allEcheances.map(e => `
                            <tr>
                                <td>${e.date || '-'}</td>
                                <td>${e.factureNumero}</td>
                                <td>${e.fournisseurNom}</td>
                                <td><strong>${(e.montant || 0).toFixed(3)} TND</strong></td>
                                <td>${e.typePaiement || '-'}</td>
                                <td><span class="status-badge status-${e.statut === 'Payé' ? 'paye' : 'en-attente'}">${e.statut}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// ==================== EXPORT ====================
const AchatModule = {
    init, showPage, refreshCurrentPage,
    // Demandes
    editDemande, deleteDemande, openDemandeModal,
    addLigne, removeLigne, recalcLigne,
    // Commandes
    editCommande, deleteCommande, openCommandeModal,
    onDemandeChange, recalcCmdLigne,
    // Livraisons
    editLivraison, deleteLivraison, openLivraisonModal,
    onCommandeChangeBL,
    // Factures
    editFacture, deleteFacture, openFactureModal,
    viewEcheances, addEcheance, removeEcheance, recalcEcheances,
    onBLChangeFacture
};
export { AchatModule };
window.AchatModule = AchatModule;
