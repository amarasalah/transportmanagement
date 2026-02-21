/**
 * ACHAT LOCAL MODULE - FIREBASE VERSION
 * UI module for procurement management
 * Linked workflow: Demande d'Achat → BC → BL → Factures
 */

import { db, doc, setDoc, COLLECTIONS } from './firebase.js';
import { SuppliersModule } from './suppliers-firebase.js';
import { DataModule } from './data-firebase.js';
import { ArticlesModule } from './articles-firebase.js';
import { CaisseModule } from './caisse-firebase.js';

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
        } else if (btn && (btn.id === 'addSortieBtn')) {
            e.preventDefault();
            e.stopPropagation();
            openSortieModal();
        } else if (btn && (btn.id === 'addReglementBtn')) {
            e.preventDefault();
            e.stopPropagation();
            openReglementModal();
        } else if (btn && (btn.id === 'addRetourBtn')) {
            e.preventDefault();
            e.stopPropagation();
            openRetourModal();
        }
    });
}

function showPage(page) {
    currentPage = page;
    refreshCurrentPage();
}

async function refreshCurrentPage() {
    await SuppliersModule.reloadAll();
    populateSupplierFilters();
    switch (currentPage) {
        case 'offres-prix': await renderDemandes(); break;
        case 'bon-commandes': await renderCommandes(); break;
        case 'bon-livraisons': await renderLivraisons(); break;
        case 'bon-sorties': await renderSorties(); break;
        case 'retours-fournisseurs': await renderRetours(); break;
        case 'factures': await renderFactures(); break;
        case 'reglements': await renderReglements(); break;
        case 'fournisseurs': await SuppliersModule.refresh(); break;
    }
}

// ==================== FILTERS ====================
async function populateSupplierFilters() {
    const suppliers = await SuppliersModule.getSuppliers();
    const opts = '<option value="">Tous</option>' + suppliers.map(s => `<option value="${s.id}">${s.nom}</option>`).join('');
    ['achatDAFournisseur', 'achatBCFournisseur', 'achatBLFournisseur', 'achatBRFournisseur', 'achatFactFournisseur'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = opts;
    });
}

function applyFilters(items, dateStartId, dateEndId, fournisseurId, statutId, statutField = 'statut') {
    const ds = document.getElementById(dateStartId)?.value;
    const de = document.getElementById(dateEndId)?.value;
    const f = document.getElementById(fournisseurId)?.value;
    const s = document.getElementById(statutId)?.value;
    let filtered = [...items];
    if (ds) filtered = filtered.filter(i => (i.date || '') >= ds);
    if (de) filtered = filtered.filter(i => (i.date || '') <= de);
    if (f) filtered = filtered.filter(i => i.fournisseurId === f);
    if (s) {
        if (statutField === 'etat_paiement') {
            filtered = filtered.filter(i => {
                const montant = parseFloat(i.montantTotal) || 0;
                const paye = (i.echeances || []).filter(e => e.statut === 'Pay\u00e9').reduce((sum, e) => sum + (e.montant || 0), 0);
                if (s === 'paye') return i.etat === 'Pay\u00e9e' || paye >= montant;
                if (s === 'partiel') return paye > 0 && paye < montant;
                if (s === 'non_paye') return paye === 0;
                return true;
            });
        } else {
            filtered = filtered.filter(i => (i[statutField] || '') === s);
        }
    }
    return filtered;
}

async function filterDemandes() { await renderDemandes(); }
async function filterCommandes() { await renderCommandes(); }
async function filterLivraisons() { await renderLivraisons(); }
async function filterSorties() { await renderSorties(); }
async function filterRetours() { await renderRetours(); }
async function filterFactures() { await renderFactures(); }

// ==================== DEMANDES D'ACHAT ====================
async function renderDemandes() {
    const allDemandes = await SuppliersModule.getDemandes();
    const demandes = applyFilters(allDemandes, 'achatDADateStart', 'achatDADateEnd', 'achatDAFournisseur', 'achatDAStatut');
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

function renderLigneRow(index, ligne = {}, articlesAchat = null) {
    const articles = articlesAchat || ArticlesModule.getArticlesByType('achat');
    const articleOpts = articles.map(a =>
        `<option value="${a.id}" data-prix="${a.prixAchat || 0}" ${ligne.articleId === a.id || ligne.nom === a.designation ? 'selected' : ''}>${a.designation} (${a.reference})</option>`
    ).join('');

    return `
        <tr data-ligne="${index}">
            <td style="padding:4px"><select class="ligne-article" onchange="AchatModule.onArticleChange(this)" style="width:100%;padding:6px;background:rgba(15,23,42,0.3);border:1px solid rgba(148,163,184,0.2);border-radius:4px;color:#f1f5f9;font-size:13px">
                <option value="">-- Sélectionner --</option>
                ${articleOpts}
                <option value="__custom" ${ligne.nom && !articles.find(a => a.id === ligne.articleId || a.designation === ligne.nom) ? 'selected' : ''}>✏️ Saisie libre</option>
            </select>
            <input type="text" class="ligne-nom-custom" value="${ligne.nom || ''}" placeholder="Nom article" style="display:${ligne.nom && !articles.find(a => a.id === ligne.articleId || a.designation === ligne.nom) ? 'block' : 'none'};width:100%;padding:6px;margin-top:4px;background:rgba(15,23,42,0.3);border:1px solid rgba(148,163,184,0.2);border-radius:4px;color:#f1f5f9;font-size:13px">
            <input type="hidden" class="ligne-nom" value="${ligne.nom || ''}">
            </td>
            <td style="padding:4px"><input type="number" class="ligne-pu" value="${ligne.prixUnitaire || 0}" step="0.001" min="0" onchange="AchatModule.recalcLigne(this)" style="width:100%;padding:6px;text-align:right;background:rgba(15,23,42,0.3);border:1px solid rgba(148,163,184,0.2);border-radius:4px;color:#f1f5f9;font-size:13px"></td>
            <td style="padding:4px"><input type="number" class="ligne-qte" value="${ligne.quantite || 1}" min="1" onchange="AchatModule.recalcLigne(this)" style="width:100%;padding:6px;text-align:right;background:rgba(15,23,42,0.3);border:1px solid rgba(148,163,184,0.2);border-radius:4px;color:#f1f5f9;font-size:13px"></td>
            <td style="padding:4px"><input type="number" class="ligne-total" value="${ligne.prixTotal || 0}" step="0.001" readonly style="width:100%;padding:6px;text-align:right;background:rgba(15,23,42,0.15);border:1px solid rgba(148,163,184,0.1);border-radius:4px;color:#10b981;font-weight:600;font-size:13px"></td>
            <td style="padding:4px;text-align:center"><button type="button" onclick="AchatModule.removeLigne(this)" style="background:none;border:none;cursor:pointer;font-size:16px;color:#ef4444">🗑️</button></td>
        </tr>
    `;
}

function onArticleChange(select) {
    const row = select.closest('tr');
    const customInput = row.querySelector('.ligne-nom-custom');
    const nomHidden = row.querySelector('.ligne-nom');
    const puInput = row.querySelector('.ligne-pu');

    if (select.value === '__custom') {
        customInput.style.display = 'block';
        customInput.focus();
        customInput.oninput = () => { nomHidden.value = customInput.value; };
    } else if (select.value) {
        customInput.style.display = 'none';
        const option = select.selectedOptions[0];
        const prix = parseFloat(option.dataset.prix) || 0;
        nomHidden.value = option.textContent.split(' (')[0];
        puInput.value = prix.toFixed(3);
        recalcLigne(puInput);
    } else {
        customInput.style.display = 'none';
        nomHidden.value = '';
    }
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
    return Array.from(rows).map(row => {
        const select = row.querySelector('.ligne-article');
        const nomHidden = row.querySelector('.ligne-nom');
        const nom = nomHidden?.value || '';
        const articleId = select?.value && select.value !== '__custom' ? select.value : null;
        return {
            nom: nom,
            articleId: articleId,
            prixUnitaire: parseFloat(row.querySelector('.ligne-pu')?.value) || 0,
            quantite: parseFloat(row.querySelector('.ligne-qte')?.value) || 0,
            prixTotal: parseFloat(row.querySelector('.ligne-total')?.value) || 0
        };
    }).filter(l => l.nom.trim());
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
    const allCommandes = await SuppliersModule.getCommandes();
    const commandes = applyFilters(allCommandes, 'achatBCDateStart', 'achatBCDateEnd', 'achatBCFournisseur', 'achatBCStatut');
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
                            <tr data-article-id="${l.articleId || ''}">
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

async function onDemandeChange() {
    const daId = document.getElementById('commandeDemandeId')?.value;
    if (!daId) return;
    const demande = SuppliersModule.getDemandeById(daId);
    if (!demande) return;

    // Fill fournisseur & camion
    const f = SuppliersModule.getSupplierById(demande.fournisseurId);
    document.getElementById('commandeFournisseurNom').value = f?.nom || '';
    document.getElementById('commandeFournisseurId').value = demande.fournisseurId || '';
    document.getElementById('commandeCamionId').value = demande.camionId || '';

    const trucks = DataModule.getTrucks ? (await DataModule.getTrucks()) : [];
    const truck = trucks.find(t => t.id === demande.camionId);
    document.getElementById('commandeCamionNom').value = truck?.matricule || demande.camionId || '';

    // Fill lignes
    const lignes = demande.lignes || [];
    const tbody = document.getElementById('commandeLignesBody');
    tbody.innerHTML = lignes.map(l => `
        <tr data-article-id="${l.articleId || ''}">
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
        const articleId = row.dataset.articleId || null;
        const pu = parseFloat(row.querySelector('.cmd-pu')?.value) || 0;
        const qte = parseFloat(row.querySelector('td:nth-child(3)').textContent) || 0;
        return { nom, articleId, prixUnitaire: pu, quantite: qte, prixTotal: pu * qte };
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
        const savedCommande = await SuppliersModule.saveCommande(commande);

        // R6/D11: Update DA status to 'Transformée' and add backlink
        if (daId && demande && !document.getElementById('commandeId').value) {
            demande.statut = 'Transformée';
            demande.bcId = savedCommande.id || commande.id;
            demande.bcNumero = savedCommande.numero || commande.numero;
            await SuppliersModule.saveDemande(demande);
        }

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
    const allLivraisons = await SuppliersModule.getLivraisons();
    const livraisons = applyFilters(allLivraisons, 'achatBLDateStart', 'achatBLDateEnd', 'achatBLFournisseur', 'achatBLStatut');
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
    const cmdLignes = commande?.lignes || [];

    const rows = document.querySelectorAll('#livraisonLignesBody tr');
    const lignes = Array.from(rows).map(row => {
        const nom = row.querySelector('td:first-child').textContent.trim();
        // Match articleId from commande lignes
        const cmdLine = cmdLignes.find(cl => cl.nom === nom);
        return {
            nom,
            articleId: cmdLine?.articleId || null,
            quantiteCommandee: parseFloat(row.querySelector('td:nth-child(2)').textContent) || 0,
            dejaRecu: parseFloat(row.querySelector('td:nth-child(3)').textContent) || 0,
            quantiteRecue: parseFloat(row.querySelector('.bl-qte')?.value) || 0
        };
    }).filter(l => l.quantiteRecue > 0);

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

        // ✅ Increase stock for each received article
        for (const ligne of lignes) {
            let article = null;
            if (ligne.articleId) {
                article = ArticlesModule.getArticleById(ligne.articleId);
            }
            // Fallback: match by name/designation for old data without articleId
            if (!article && ligne.nom) {
                const allArticles = await ArticlesModule.getArticles();
                article = allArticles.find(a => a.designation === ligne.nom || a.reference === ligne.nom);
            }
            if (article) {
                const newStock = (article.stock || 0) + ligne.quantiteRecue;
                await setDoc(doc(db, COLLECTIONS.articles, article.id), { ...article, stock: newStock });
            }
        }
        // Refresh articles cache
        await ArticlesModule.refresh();

        // Update BC status
        if (commande) {
            const allBLs = await SuppliersModule.getLivraisons();
            const bcBLs = allBLs.filter(bl => bl.commandeId === bcId);
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
    const allFactures = await SuppliersModule.getFactures();
    const factures = applyFilters(allFactures, 'achatFactDateStart', 'achatFactDateEnd', 'achatFactFournisseur', 'achatFactStatut', 'etat_paiement');
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
    // For existing facture, support both old single livraisonId and new array livraisonIds
    const existingBLIds = facture?.livraisonIds || (facture?.livraisonId ? [facture.livraisonId] : []);
    const activeBLs = livraisons.filter(l => l.statut === 'Re\u00e7u' || existingBLIds.includes(l.id));

    const blCheckboxes = activeBLs.map(l => {
        const f = SuppliersModule.getSupplierById(l.fournisseurId);
        const cmd = SuppliersModule.getCommandeById(l.commandeId);
        let blTotal = 0;
        (l.lignes || []).forEach(ll => {
            const cmdLine = (cmd?.lignes || []).find(cl => cl.nom === ll.nom);
            blTotal += (ll.quantiteRecue || 0) * (cmdLine?.prixUnitaire || 0);
        });
        const checked = existingBLIds.includes(l.id) ? 'checked' : '';
        return `<label style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:rgba(15,23,42,0.2);border-radius:6px;cursor:pointer;font-size:13px">
            <input type="checkbox" class="facture-bl-check" value="${l.id}" data-montant="${blTotal}" data-fournisseur="${l.fournisseurId}" ${checked} onchange="AchatModule.onBLChangeFacture()" ${facture ? 'disabled' : ''}>
            <span style="color:#f1f5f9">${l.numero || l.id}</span>
            <span style="color:#94a3b8;font-size:11px">- ${f?.nom || ''}</span>
            <span style="color:#10b981;font-weight:600;margin-left:auto">${blTotal.toFixed(3)} TND</span>
        </label>`;
    }).join('');

    const echeances = facture?.echeances || [{ date: new Date().toISOString().split('T')[0], montant: 0, typePaiement: 'Virement', statut: 'En attente' }];

    document.getElementById('modalTitle').textContent = facture ? 'Modifier Facture' : 'Nouvelle Facture Fournisseur';
    document.getElementById('modalBody').innerHTML = `
        <form id="factureForm">
            <input type="hidden" id="factureId" value="${facture?.id || ''}">
            <div class="form-group">
                <label style="font-weight:600;margin-bottom:8px;display:block">📦 Bons de Livraison (s\u00e9lection multiple)</label>
                <div id="factureBLList" style="display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto;padding:8px;background:rgba(15,23,42,0.3);border-radius:8px;border:1px solid rgba(148,163,184,0.15)">
                    ${blCheckboxes || '<div style="color:#64748b;padding:12px;text-align:center;font-size:13px">Aucun BL disponible</div>'}
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Date Facture</label>
                    <input type="date" id="factureDate" value="${facture?.date || new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group">
                    <label>N\u00b0 Facture</label>
                    <input type="text" id="factureNumero" value="${facture?.numeroFournisseur || ''}" placeholder="Ex: FACT-2026-001">
                </div>
            </div>
            <div class="form-group">
                <label>Montant Total (TND)</label>
                <input type="number" id="factureMontant" value="${facture?.montantTotal || ''}" step="0.001" required readonly style="background:rgba(15,23,42,0.2)">
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
    const checks = document.querySelectorAll('.facture-bl-check:checked');
    let total = 0;
    checks.forEach(c => total += parseFloat(c.dataset.montant) || 0);
    document.getElementById('factureMontant').value = total.toFixed(3);
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
    // Collect all checked BL IDs
    const checks = document.querySelectorAll('.facture-bl-check:checked');
    const blIds = Array.from(checks).map(c => c.value);
    const montant = parseFloat(document.getElementById('factureMontant').value) || 0;

    if (blIds.length === 0) { alert('S\u00e9lectionnez au moins un BL'); return; }

    // Determine fournisseur from first BL
    const firstBL = SuppliersModule.getLivraisonById(blIds[0]);
    const blNumeros = blIds.map(id => SuppliersModule.getLivraisonById(id)?.numero || id).join(', ');

    // Validate: total \u00e9ch\u00e9ances must not exceed montant total
    const totalEcheances = echeances.reduce((s, e) => s + (e.montant || 0), 0);
    if (totalEcheances > montant && montant > 0) {
        alert(`Le total des \u00e9ch\u00e9ances (${totalEcheances.toFixed(3)} TND) d\u00e9passe le montant (${montant.toFixed(3)} TND)`);
        return;
    }

    const paye = echeances.filter(e => e.statut === 'Pay\u00e9').reduce((s, e) => s + e.montant, 0);
    let etat = 'Non Pay\u00e9e';
    if (paye >= montant && montant > 0) etat = 'Pay\u00e9e';
    else if (paye > 0) etat = 'Partiel';

    const facture = {
        id: document.getElementById('factureId').value || null,
        numero: document.getElementById('factureId').value ? SuppliersModule.getFactureById(document.getElementById('factureId').value)?.numero : `FA-${Date.now().toString().slice(-6)}`,
        date: document.getElementById('factureDate').value,
        numeroFournisseur: document.getElementById('factureNumero').value,
        livraisonIds: blIds,
        livraisonId: blIds[0] || null,
        blNumero: blNumeros,
        fournisseurId: firstBL?.fournisseurId || '',
        montantTotal: montant,
        echeances: echeances,
        etat: etat
    };

    try {
        // Create Caisse décaissements for newly paid échéances
        const existingFacture = facture.id ? SuppliersModule.getFactureById(facture.id) : null;
        const existingEcheances = existingFacture?.echeances || [];

        for (let i = 0; i < echeances.length; i++) {
            const ech = echeances[i];
            if (ech.statut === 'Payé' && !ech.caisseId) {
                const wasAlreadyPaid = existingEcheances[i]?.statut === 'Payé' && existingEcheances[i]?.caisseId;
                if (!wasAlreadyPaid) {
                    const supplier = SuppliersModule.getSupplierById(firstBL?.fournisseurId || facture.fournisseurId);
                    const caisseId = await CaisseModule.addAutoTransaction({
                        type: 'decaissement',
                        tiers: supplier?.nom || 'Fournisseur',
                        montant: ech.montant,
                        mode: ech.typePaiement,
                        reference: facture.numero,
                        notes: `Paiement fournisseur ${facture.numero}`,
                        source: 'achat'
                    });
                    if (caisseId) ech.caisseId = caisseId;
                }
            }
        }
        facture.echeances = echeances;

        await SuppliersModule.saveFacture(facture);

        // Update supplier solde
        const supplierId = firstBL?.fournisseurId || facture.fournisseurId;
        if (supplierId) {
            await updateSupplierSolde(supplierId);
        }

        App.hideModal();
        await renderFactures();
    } catch (err) {
        console.error('Erreur sauvegarde facture:', err);
        alert('Erreur: ' + err.message);
    }
}

// R5: Recalculate supplier solde from all factures
async function updateSupplierSolde(supplierId) {
    try {
        const factures = await SuppliersModule.getFactures();
        const supplierFactures = factures.filter(f => f.fournisseurId === supplierId);
        let totalDu = 0;
        let totalPaye = 0;
        supplierFactures.forEach(f => {
            totalDu += parseFloat(f.montantTotal) || 0;
            (f.echeances || []).forEach(e => {
                if (e.statut === 'Payé') totalPaye += (e.montant || 0);
            });
        });
        const solde = totalDu - totalPaye;
        const supplier = SuppliersModule.getSupplierById(supplierId);
        if (supplier) {
            await setDoc(doc(db, COLLECTIONS.suppliers, supplierId), { ...supplier, solde: solde, updatedAt: new Date().toISOString() });
        }
    } catch (err) {
        console.error('Error updating supplier solde:', err);
    }
}

function editFacture(id) { openFactureModal(id); }
async function deleteFacture(id) {
    if (confirm('Supprimer cette facture?')) {
        // Remove linked caisse transactions before deleting
        const facture = SuppliersModule.getFactureById(id);
        if (facture) {
            for (const ech of (facture.echeances || [])) {
                if (ech.caisseId) {
                    await CaisseModule.removeAutoTransaction(ech.caisseId);
                }
            }
            // Update supplier solde
            if (facture.fournisseurId) {
                // Will recalculate after delete
                setTimeout(() => updateSupplierSolde(facture.fournisseurId), 500);
            }
        }
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
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                <h3 style="font-size:1rem">📋 Toutes les échéances</h3>
                <button class="btn btn-primary" id="addReglementBtn">➕ Nouvelle Transaction</button>
            </div>
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
                            <th>Caisse</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allEcheances.length === 0 ? '<tr><td colspan="7" style="text-align:center;color:#64748b;padding:30px">Aucune échéance</td></tr>' :
            allEcheances.map(e => `
                            <tr>
                                <td>${e.date || '-'}</td>
                                <td>${e.factureNumero}</td>
                                <td>${e.fournisseurNom}</td>
                                <td><strong>${(e.montant || 0).toFixed(3)} TND</strong></td>
                                <td>${e.typePaiement || '-'}</td>
                                <td><span class="status-badge status-${e.statut === 'Payé' ? 'paye' : 'en-attente'}">${e.statut}</span></td>
                                <td>${e.caisseId ? '<span style="color:#10b981;font-size:11px">✅ Caisse</span>' : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async function openReglementModal() {
    const factures = await SuppliersModule.getFactures();

    // Build facture options with remaining balance
    const factureOpts = factures.map(f => {
        const montant = parseFloat(f.montantTotal) || 0;
        const echeances = f.echeances || [];
        const paye = echeances.filter(e => e.statut === 'Payé').reduce((s, e) => s + (e.montant || 0), 0);
        const restant = montant - paye;
        const fournisseur = SuppliersModule.getSupplierById(f.fournisseurId);
        return `<option value="${f.id}" data-montant="${montant}" data-paye="${paye}" data-restant="${restant}" data-fournisseur="${fournisseur?.nom || '-'}">${f.numero || f.id} — ${fournisseur?.nom || ''} (Restant: ${restant.toFixed(3)} TND)</option>`;
    }).join('');

    document.getElementById('modalTitle').textContent = 'Nouvelle Transaction';
    document.getElementById('modalBody').innerHTML = `
        <form id="reglementForm">
            <div class="form-group">
                <label>Facture *</label>
                <select id="reglementFactureId" onchange="AchatModule.onFactureChangeReglement()" required>
                    <option value="">-- Sélectionner une facture --</option>
                    ${factureOpts}
                </select>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:12px 0;padding:12px;background:rgba(148,163,184,0.05);border-radius:8px">
                <div style="text-align:center">
                    <div style="font-size:16px;font-weight:700;color:#f1f5f9" id="reglementMontantTotal">0.000</div>
                    <div style="font-size:11px;color:#64748b">Montant Total</div>
                </div>
                <div style="text-align:center">
                    <div style="font-size:16px;font-weight:700;color:#10b981" id="reglementMontantPaye">0.000</div>
                    <div style="font-size:11px;color:#64748b">Déjà Payé</div>
                </div>
                <div style="text-align:center">
                    <div style="font-size:16px;font-weight:700;color:#ef4444" id="reglementMontantRestant">0.000</div>
                    <div style="font-size:11px;color:#64748b">Restant</div>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Montant Transaction (TND) *</label>
                    <input type="number" id="reglementMontant" step="0.001" required>
                </div>
                <div class="form-group">
                    <label>Date *</label>
                    <input type="date" id="reglementDate" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
            </div>
            <div class="form-group">
                <label>Type Paiement</label>
                <select id="reglementType">
                    <option value="Virement">Virement</option>
                    <option value="Versement">Versement</option>
                    <option value="Traite">Traite</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Espèce">Espèce</option>
                </select>
            </div>
        </form>
    `;
    document.getElementById('modalSave').onclick = saveReglement;
    App.showModal();
}

function onFactureChangeReglement() {
    const sel = document.getElementById('reglementFactureId');
    if (!sel || !sel.value) return;
    const opt = sel.options[sel.selectedIndex];
    const montant = parseFloat(opt.dataset.montant) || 0;
    const paye = parseFloat(opt.dataset.paye) || 0;
    const restant = parseFloat(opt.dataset.restant) || 0;

    document.getElementById('reglementMontantTotal').textContent = montant.toFixed(3);
    document.getElementById('reglementMontantPaye').textContent = paye.toFixed(3);
    document.getElementById('reglementMontantRestant').textContent = restant.toFixed(3);
    document.getElementById('reglementMontant').value = restant.toFixed(3);
}

async function saveReglement() {
    const factureId = document.getElementById('reglementFactureId')?.value;
    if (!factureId) { alert('Sélectionnez une facture'); return; }

    const montant = parseFloat(document.getElementById('reglementMontant').value) || 0;
    if (montant <= 0) { alert('Montant invalide'); return; }

    const date = document.getElementById('reglementDate').value;
    const typePaiement = document.getElementById('reglementType').value;

    // Get facture and add new echeance
    const facture = SuppliersModule.getFactureById(factureId);
    if (!facture) { alert('Facture introuvable'); return; }

    const echeances = facture.echeances || [];

    // Create Caisse décaissement FIRST
    const supplier = SuppliersModule.getSupplierById(facture.fournisseurId);
    const caisseId = await CaisseModule.addAutoTransaction({
        type: 'decaissement',
        tiers: supplier?.nom || 'Fournisseur',
        montant: montant,
        mode: typePaiement,
        reference: facture.numero || facture.id,
        notes: `Paiement fournisseur ${facture.numero || facture.id}`,
        source: 'achat'
    });

    echeances.push({ date, montant, typePaiement, statut: 'Payé', caisseId: caisseId || null });

    // Recalculate etat
    const totalPaye = echeances.filter(e => e.statut === 'Payé').reduce((s, e) => s + (e.montant || 0), 0);
    const total = parseFloat(facture.montantTotal) || 0;
    let etat = 'Non Payée';
    if (totalPaye >= total && total > 0) etat = 'Payée';
    else if (totalPaye > 0) etat = 'Partiel';

    try {
        await SuppliersModule.saveFacture({ ...facture, echeances, etat });

        // R5: Update supplier solde
        if (facture.fournisseurId) {
            await updateSupplierSolde(facture.fournisseurId);
        }

        App.hideModal();
        await renderReglements();
    } catch (err) {
        console.error('Erreur sauvegarde règlement:', err);
        alert('Erreur: ' + err.message);
    }
}

// ==================== BONS DE SORTIE ====================
async function renderSorties() {
    const allSorties = await SuppliersModule.getSorties();
    const sorties = applyFilters(allSorties, 'achatBSDateStart', 'achatBSDateEnd', null, 'achatBSStatut');
    const tbody = document.getElementById('sortiesBody');
    if (!tbody) return;

    if (sorties.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;padding:30px">Aucun bon de sortie</td></tr>';
        return;
    }

    const trucks = DataModule.getTrucks ? (await DataModule.getTrucks()) : [];
    tbody.innerHTML = sorties.map(s => {
        const truck = trucks.find(t => t.id === s.camionId);
        return `
            <tr>
                <td><strong>${s.numero || s.id}</strong></td>
                <td>${s.date || '-'}</td>
                <td>${s.livraisonNumero || '-'}</td>
                <td>${truck?.matricule || s.camionId || '-'}</td>
                <td>${(s.lignes || []).length} article(s)</td>
                <td><span class="status-badge status-${(s.statut || '').toLowerCase()}">${s.statut || 'Sorti'}</span></td>
                <td>
                    <button class="btn-icon" onclick="AchatModule.editSortie('${s.id}')">✏️</button>
                    <button class="btn-icon" onclick="AchatModule.deleteSortie('${s.id}')">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function openSortieModal(sortieId = null) {
    const sortie = sortieId ? SuppliersModule.getSortieById(sortieId) : null;
    const livraisons = await SuppliersModule.getLivraisons();
    const activeBLs = livraisons.filter(bl => bl.statut === 'Reçu' || bl.id === sortie?.livraisonId);
    const trucks = DataModule.getTrucks ? (await DataModule.getTrucks()) : [];

    const blOpts = activeBLs.map(bl => {
        const f = SuppliersModule.getSupplierById(bl.fournisseurId);
        return `<option value="${bl.id}" ${sortie?.livraisonId === bl.id ? 'selected' : ''}>${bl.numero || bl.id} - ${f?.nom || ''}</option>`;
    }).join('');

    const truckOpts = trucks.map(t =>
        `<option value="${t.id}" ${sortie?.camionId === t.id ? 'selected' : ''}>${t.matricule} (${t.type || ''})</option>`
    ).join('');

    const lignes = sortie?.lignes || [];

    document.getElementById('modalTitle').textContent = sortie ? 'Modifier Bon de Sortie' : 'Nouveau Bon de Sortie';
    document.getElementById('modalBody').innerHTML = `
        <form id="sortieForm">
            <input type="hidden" id="sortieId" value="${sortie?.id || ''}">
            <div class="form-row">
                <div class="form-group">
                    <label>Bon Livraison source</label>
                    <select id="sortieBLId" onchange="AchatModule.onBLChangeSortie()" ${sortie ? 'disabled' : ''} required>
                        <option value="">-- Sélectionner un BL --</option>
                        ${blOpts}
                    </select>
                </div>
                <div class="form-group">
                    <label>Date Sortie</label>
                    <input type="date" id="sortieDate" value="${sortie?.date || new Date().toISOString().split('T')[0]}" required>
                </div>
            </div>
            <div class="form-group">
                <label>🚚 Camion *</label>
                <select id="sortieCamion" required>
                    <option value="">-- Sélectionner un camion --</option>
                    ${truckOpts}
                </select>
            </div>
            <div style="margin-top:16px">
                <label style="font-weight:600;margin-bottom:8px;display:block">📦 Articles à sortir</label>
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                    <thead>
                        <tr style="background:rgba(148,163,184,0.1)">
                            <th style="padding:8px;text-align:left">Nom</th>
                            <th style="padding:8px;text-align:right;width:100px">Disponible</th>
                            <th style="padding:8px;text-align:right;width:120px">Qté sortie</th>
                        </tr>
                    </thead>
                    <tbody id="sortieLignesBody">
                        ${lignes.map(l => `
                            <tr>
                                <td style="padding:6px;color:#f1f5f9">${l.nom}</td>
                                <td style="padding:6px;text-align:right;color:#94a3b8">${l.disponible || 0}</td>
                                <td style="padding:4px"><input type="number" class="bs-qte" value="${l.quantiteSortie || 0}" min="0" max="${l.disponible || 0}" style="width:100%;padding:6px;text-align:right;background:rgba(15,23,42,0.3);border:1px solid rgba(148,163,184,0.2);border-radius:4px;color:#f1f5f9;font-size:13px"></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${lignes.length === 0 ? '<div style="color:#64748b;padding:20px;text-align:center;font-size:13px">Sélectionnez un Bon Livraison pour charger les articles</div>' : ''}
            </div>
        </form>
    `;
    document.getElementById('modalSave').onclick = saveSortieForm;
    App.showModal();
}

async function onBLChangeSortie() {
    const blId = document.getElementById('sortieBLId')?.value;
    if (!blId) return;
    const livraison = SuppliersModule.getLivraisonById(blId);
    if (!livraison) return;

    // Get existing BS for this BL
    const allBS = await SuppliersModule.getSorties();
    const existingBS = allBS.filter(bs => bs.livraisonId === blId);

    const tbody = document.getElementById('sortieLignesBody');
    tbody.innerHTML = (livraison.lignes || []).map(l => {
        // Calculate already sorted qty
        let dejaSorti = 0;
        existingBS.forEach(bs => {
            const bsLine = (bs.lignes || []).find(bsl => bsl.nom === l.nom);
            if (bsLine) dejaSorti += (bsLine.quantiteSortie || 0);
        });
        const disponible = Math.max(0, (l.quantiteRecue || 0) - dejaSorti);

        return `
            <tr>
                <td style="padding:6px;color:#f1f5f9">${l.nom}</td>
                <td style="padding:6px;text-align:right;color:#94a3b8">${disponible}</td>
                <td style="padding:4px"><input type="number" class="bs-qte" value="${disponible}" min="0" max="${disponible}" style="width:100%;padding:6px;text-align:right;background:rgba(15,23,42,0.3);border:1px solid rgba(148,163,184,0.2);border-radius:4px;color:#f1f5f9;font-size:13px"></td>
            </tr>
        `;
    }).join('');
}

async function saveSortieForm() {
    const blId = document.getElementById('sortieBLId')?.value;
    const camionId = document.getElementById('sortieCamion')?.value;
    const livraison = blId ? SuppliersModule.getLivraisonById(blId) : null;

    if (!camionId) { alert('Sélectionnez un camion'); return; }

    const rows = document.querySelectorAll('#sortieLignesBody tr');
    const lignes = Array.from(rows).map(row => {
        const nom = row.querySelector('td:first-child').textContent.trim();
        const disponible = parseFloat(row.querySelector('td:nth-child(2)').textContent) || 0;
        const quantiteSortie = parseFloat(row.querySelector('.bs-qte')?.value) || 0;
        // Find articleId from livraison lignes
        const blLine = (livraison?.lignes || []).find(l => l.nom === nom);
        return {
            nom,
            articleId: blLine?.articleId || null,
            disponible,
            quantiteSortie
        };
    }).filter(l => l.quantiteSortie > 0);

    if (lignes.length === 0) { alert('Aucune quantité à sortir'); return; }

    const sortieDate = document.getElementById('sortieDate').value;

    const sortie = {
        id: document.getElementById('sortieId').value || null,
        numero: document.getElementById('sortieId').value ? SuppliersModule.getSortieById(document.getElementById('sortieId').value)?.numero : `BS-${Date.now().toString().slice(-6)}`,
        date: sortieDate,
        livraisonId: blId || null,
        livraisonNumero: livraison?.numero || '',
        camionId: camionId,
        lignes: lignes,
        statut: 'Sorti'
    };

    try {
        await SuppliersModule.saveSortie(sortie);

        // Reduce stock from Articles d'Achat
        let totalCoutBS = 0;
        for (const ligne of lignes) {
            if (ligne.articleId) {
                const article = ArticlesModule.getArticleById(ligne.articleId);
                if (article) {
                    const newStock = Math.max(0, (article.stock || 0) - ligne.quantiteSortie);
                    await setDoc(doc(db, COLLECTIONS.articles, article.id), { ...article, stock: newStock });
                    // Accumulate cost for daily entry
                    totalCoutBS += (article.prixAchat || 0) * ligne.quantiteSortie;
                }
            }
        }
        // Refresh articles cache
        await ArticlesModule.refresh();

        // ✅ Add BS cost to Saisie Journalière (truck charge for this date)
        if (totalCoutBS > 0 && sortieDate && camionId) {
            try {
                const entries = await DataModule.getEntries();
                // Find existing entry for same truck + same date
                const existingEntry = entries.find(e => e.camionId === camionId && e.date === sortieDate);

                if (existingEntry) {
                    // Add BS cost to existing entry's maintenance field
                    existingEntry.maintenance = (existingEntry.maintenance || 0) + totalCoutBS;
                    existingEntry.remarques = ((existingEntry.remarques || '') + `\n[BS Auto] ${sortie.numero}: ${totalCoutBS.toFixed(3)} TND`).trim();
                    await DataModule.saveEntry(existingEntry);
                } else {
                    // Create a new entry for this truck + date
                    const drivers = await DataModule.getDrivers();
                    const driver = drivers.find(d => d.camionId === camionId);
                    const truck = await DataModule.getTruckById(camionId);

                    const newEntry = {
                        date: sortieDate,
                        camionId: camionId,
                        chauffeurId: driver?.id || '',
                        origine: '',
                        destination: '',
                        kilometrage: 0,
                        quantiteGasoil: 0,
                        prixGasoilLitre: 2,
                        maintenance: totalCoutBS,
                        prixLivraison: 0,
                        remarques: `[BS Auto] ${sortie.numero}: ${totalCoutBS.toFixed(3)} TND`
                    };
                    await DataModule.saveEntry(newEntry);
                }
                console.log(`✅ BS ${sortie.numero}: ${totalCoutBS.toFixed(3)} TND ajouté aux charges camion`);
            } catch (entryErr) {
                console.error('Erreur ajout charge BS à saisie journalière:', entryErr);
            }
        }

        App.hideModal();
        await renderSorties();
    } catch (err) {
        console.error('Erreur sauvegarde BS:', err);
        alert('Erreur: ' + err.message);
    }
}

function editSortie(id) { openSortieModal(id); }
async function deleteSortie(id) {
    if (confirm('Supprimer ce bon de sortie?')) {
        await SuppliersModule.deleteSortie(id);
        await renderSorties();
    }
}

// ==================== BONS DE RETOUR FOURNISSEUR ====================
async function renderRetours() {
    const allRetours = await SuppliersModule.getRetours();
    const retours = applyFilters(allRetours, 'achatBRDateStart', 'achatBRDateEnd', 'achatBRFournisseur', 'achatBRStatut');
    const tbody = document.getElementById('retoursBody');
    if (!tbody) return;

    if (retours.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#64748b;padding:30px">Aucun bon de retour</td></tr>';
        return;
    }

    tbody.innerHTML = retours.map(r => {
        const supplier = SuppliersModule.getSupplierById(r.fournisseurId);
        const nbArticles = (r.lignes || []).reduce((s, l) => s + (l.quantiteRetour || 0), 0);
        return `
            <tr>
                <td><strong>${r.numero || r.id}</strong></td>
                <td>${r.date || '-'}</td>
                <td>${r.livraisonNumero || '-'}</td>
                <td>${supplier?.nom || '-'}</td>
                <td>${nbArticles} article(s)</td>
                <td>${r.motif || '-'}</td>
                <td><span class="status-badge status-${(r.statut || '').toLowerCase().replace(/\s/g, '-')}">${r.statut || 'En cours'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="AchatModule.editRetour('${r.id}')">&#x270F;&#xFE0F;</button>
                    <button class="btn btn-sm btn-outline" onclick="AchatModule.deleteRetour('${r.id}')" style="color:#ef4444">&#x1F5D1;&#xFE0F;</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function openRetourModal(retourId = null) {
    const retour = retourId ? SuppliersModule.getRetourById(retourId) : null;
    const livraisons = await SuppliersModule.getLivraisons();
    const activeBLs = livraisons.filter(bl => bl.statut === 'Re\u00e7u' || bl.id === retour?.livraisonId);

    const blOpts = activeBLs.map(bl => {
        const s = SuppliersModule.getSupplierById(bl.fournisseurId);
        return `<option value="${bl.id}" ${retour?.livraisonId === bl.id ? 'selected' : ''}>${bl.numero || bl.id} - ${s?.nom || ''}</option>`;
    }).join('');

    const lignes = retour?.lignes || [];

    document.getElementById('modalTitle').textContent = retour ? 'Modifier Bon de Retour' : 'Nouveau Bon de Retour Fournisseur';
    document.getElementById('modalBody').innerHTML = `
        <form id="retourForm">
            <input type="hidden" id="retourId" value="${retour?.id || ''}">
            <div class="form-row">
                <div class="form-group">
                    <label>BL Source</label>
                    <select id="retourBLId" onchange="AchatModule.onBLChangeRetour()" ${retour ? 'disabled' : ''} required>
                        <option value="">-- S\u00e9lectionner un BL --</option>
                        ${blOpts}
                    </select>
                </div>
                <div class="form-group">
                    <label>Date Retour</label>
                    <input type="date" id="retourDate" value="${retour?.date || new Date().toISOString().split('T')[0]}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Fournisseur</label>
                    <input type="text" id="retourFournisseurNom" value="${retour?.fournisseurId ? SuppliersModule.getSupplierById(retour.fournisseurId)?.nom || '' : ''}" readonly style="background:rgba(15,23,42,0.2)">
                    <input type="hidden" id="retourFournisseurId" value="${retour?.fournisseurId || ''}">
                </div>
                <div class="form-group">
                    <label>Motif</label>
                    <select id="retourMotif">
                        <option value="D\u00e9fectueux" ${retour?.motif === 'D\u00e9fectueux' ? 'selected' : ''}>D\u00e9fectueux</option>
                        <option value="Non conforme" ${retour?.motif === 'Non conforme' ? 'selected' : ''}>Non conforme</option>
                        <option value="Erreur commande" ${retour?.motif === 'Erreur commande' ? 'selected' : ''}>Erreur commande</option>
                        <option value="Surplus" ${retour?.motif === 'Surplus' ? 'selected' : ''}>Surplus</option>
                        <option value="Autre" ${retour?.motif === 'Autre' ? 'selected' : ''}>Autre</option>
                    </select>
                </div>
            </div>
            <div style="margin-top:16px">
                <label style="font-weight:600;margin-bottom:8px;display:block">&#x21A9;&#xFE0F; Articles \u00e0 retourner</label>
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                    <thead>
                        <tr style="background:rgba(148,163,184,0.1)">
                            <th style="padding:8px;text-align:left">Article</th>
                            <th style="padding:8px;text-align:right;width:80px">Re\u00e7u</th>
                            <th style="padding:8px;text-align:right;width:100px">Qt\u00e9 Retour</th>
                        </tr>
                    </thead>
                    <tbody id="retourLignesBody">
                        ${lignes.map(l => `
                            <tr>
                                <td style="padding:6px;color:#f1f5f9">${l.nom}</td>
                                <td style="padding:6px;text-align:right;color:#94a3b8">${l.quantiteRecue || 0}</td>
                                <td style="padding:4px"><input type="number" class="br-qte" value="${l.quantiteRetour || 0}" min="0" max="${l.quantiteRecue || 0}" style="width:100%;padding:6px;text-align:right;background:rgba(15,23,42,0.3);border:1px solid rgba(148,163,184,0.2);border-radius:4px;color:#f1f5f9;font-size:13px"></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${lignes.length === 0 ? '<div style="color:#64748b;padding:20px;text-align:center;font-size:13px">S\u00e9lectionnez un BL pour charger les articles</div>' : ''}
            </div>
        </form>
    `;
    document.getElementById('modalSave').onclick = saveRetourForm;
    App.showModal();
}

async function onBLChangeRetour() {
    const blId = document.getElementById('retourBLId')?.value;
    if (!blId) return;
    const livraison = SuppliersModule.getLivraisonById(blId);
    if (!livraison) return;

    const supplier = SuppliersModule.getSupplierById(livraison.fournisseurId);
    const fournisseurNomEl = document.getElementById('retourFournisseurNom');
    const fournisseurIdEl = document.getElementById('retourFournisseurId');
    if (fournisseurNomEl) fournisseurNomEl.value = supplier?.nom || '';
    if (fournisseurIdEl) fournisseurIdEl.value = livraison.fournisseurId || '';

    const tbody = document.getElementById('retourLignesBody');
    tbody.innerHTML = (livraison.lignes || []).map(l => `
        <tr>
            <td style="padding:6px;color:#f1f5f9">${l.nom}</td>
            <td style="padding:6px;text-align:right;color:#94a3b8">${l.quantiteRecue || 0}</td>
            <td style="padding:4px"><input type="number" class="br-qte" value="0" min="0" max="${l.quantiteRecue || 0}" style="width:100%;padding:6px;text-align:right;background:rgba(15,23,42,0.3);border:1px solid rgba(148,163,184,0.2);border-radius:4px;color:#f1f5f9;font-size:13px"></td>
        </tr>
    `).join('');
}

async function saveRetourForm() {
    const blId = document.getElementById('retourBLId')?.value;
    const livraison = blId ? SuppliersModule.getLivraisonById(blId) : null;
    const blLignes = livraison?.lignes || [];

    const rows = document.querySelectorAll('#retourLignesBody tr');
    const lignes = Array.from(rows).map((row, i) => {
        const nom = row.querySelector('td:first-child').textContent.trim();
        const quantiteRecue = parseFloat(row.querySelector('td:nth-child(2)').textContent) || 0;
        const quantiteRetour = parseFloat(row.querySelector('.br-qte')?.value) || 0;
        const blLine = blLignes.find(cl => cl.nom === nom);
        return {
            nom,
            articleId: blLine?.articleId || null,
            quantiteRecue,
            quantiteRetour
        };
    }).filter(l => l.quantiteRetour > 0);

    if (lignes.length === 0) { alert('Aucune quantit\u00e9 \u00e0 retourner'); return; }

    const retour = {
        id: document.getElementById('retourId').value || null,
        numero: document.getElementById('retourId').value
            ? SuppliersModule.getRetourById(document.getElementById('retourId').value)?.numero
            : `BR-${Date.now().toString().slice(-6)}`,
        date: document.getElementById('retourDate').value,
        livraisonId: blId || null,
        livraisonNumero: livraison?.numero || '',
        fournisseurId: document.getElementById('retourFournisseurId').value || '',
        motif: document.getElementById('retourMotif').value,
        lignes: lignes,
        statut: 'Retourn\u00e9'
    };

    try {
        await SuppliersModule.saveRetour(retour);

        // Decrease stock for each returned article
        for (const ligne of lignes) {
            let article = null;
            if (ligne.articleId) {
                article = ArticlesModule.getArticleById(ligne.articleId);
            }
            if (!article && ligne.nom) {
                const allArticles = await ArticlesModule.getArticles();
                article = allArticles.find(a => a.designation === ligne.nom || a.reference === ligne.nom);
            }
            if (article) {
                const newStock = Math.max(0, (article.stock || 0) - ligne.quantiteRetour);
                await setDoc(doc(db, COLLECTIONS.articles, article.id), { ...article, stock: newStock });
            }
        }
        await ArticlesModule.refresh();

        App.hideModal();
        await renderRetours();
    } catch (err) {
        console.error('Erreur sauvegarde BR:', err);
        alert('Erreur: ' + err.message);
    }
}

function editRetour(id) { openRetourModal(id); }

async function deleteRetour(id) {
    if (confirm('Supprimer ce bon de retour? Le stock sera r\u00e9-ajust\u00e9.')) {
        const retour = SuppliersModule.getRetourById(id);
        if (retour) {
            // Re-increase stock for returned articles
            for (const ligne of (retour.lignes || [])) {
                let article = null;
                if (ligne.articleId) {
                    article = ArticlesModule.getArticleById(ligne.articleId);
                }
                if (!article && ligne.nom) {
                    const allArticles = await ArticlesModule.getArticles();
                    article = allArticles.find(a => a.designation === ligne.nom || a.reference === ligne.nom);
                }
                if (article) {
                    const newStock = (article.stock || 0) + ligne.quantiteRetour;
                    await setDoc(doc(db, COLLECTIONS.articles, article.id), { ...article, stock: newStock });
                }
            }
            await ArticlesModule.refresh();
        }
        await SuppliersModule.deleteRetour(id);
        await renderRetours();
    }
}

// ==================== EXPORT ====================
const AchatModule = {
    init, showPage, refreshCurrentPage,
    // Demandes
    editDemande, deleteDemande, openDemandeModal,
    addLigne, removeLigne, recalcLigne, onArticleChange,
    // Commandes
    editCommande, deleteCommande, openCommandeModal,
    onDemandeChange, recalcCmdLigne,
    // Livraisons
    editLivraison, deleteLivraison, openLivraisonModal,
    onCommandeChangeBL,
    // Bons de Sortie
    editSortie, deleteSortie, openSortieModal,
    onBLChangeSortie,
    // Bons de Retour
    editRetour, deleteRetour, openRetourModal,
    onBLChangeRetour,
    // Factures
    editFacture, deleteFacture, openFactureModal,
    viewEcheances, addEcheance, removeEcheance, recalcEcheances,
    onBLChangeFacture,
    // Reglements
    openReglementModal, onFactureChangeReglement,
    // Filters
    filterDemandes, filterCommandes, filterLivraisons, filterSorties, filterRetours, filterFactures
};
export { AchatModule };
window.AchatModule = AchatModule;
