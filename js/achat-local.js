/**
 * ACHAT LOCAL MODULE
 * UI module for procurement management (Offres, BC, BL, Factures, Reglements)
 * Linked to trucks for maintenance tracking
 */

const AchatLocalModule = (() => {
    let currentPage = '';

    function init() {
        SuppliersModule.init();
        setupEventListeners();
        console.log('🛒 AchatLocalModule initialized');
    }

    function setupEventListeners() {
        // Toggle submenu
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-toggle="achat-local"]')) {
                e.preventDefault();
                toggleSubmenu();
            }
        });

        // Navigation to achat local pages
        document.addEventListener('click', (e) => {
            const page = e.target.closest('[data-page]')?.dataset.page;
            if (page && ['offres-prix', 'bon-commandes', 'bon-livraisons', 'factures', 'reglements', 'fournisseurs'].includes(page)) {
                e.preventDefault();
                showPage(page);
            }
        });

        // Add buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('#addOffreBtn')) openOffreModal();
            if (e.target.closest('#addCommandeBtn')) openCommandeModal();
            if (e.target.closest('#addLivraisonBtn')) openLivraisonModal();
            if (e.target.closest('#addFactureBtn')) openFactureModal();
            if (e.target.closest('#addReglementBtn')) openReglementModal();
            if (e.target.closest('#addFournisseurBtn')) openFournisseurModal();
        });
    }

    function toggleSubmenu() {
        const submenu = document.getElementById('achat-local-submenu');
        const toggle = document.querySelector('[data-toggle="achat-local"]');
        const group = toggle ? toggle.closest('.nav-group') : null;
        if (submenu) submenu.classList.toggle('active');
        if (group) group.classList.toggle('open');
    }

    function showPage(page) {
        currentPage = page;

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

        // Show selected page
        const pageEl = document.getElementById(`page-${page}`);
        if (pageEl) pageEl.classList.add('active');

        // Update page title
        const titles = {
            'offres-prix': 'Demandes Offres de Prix',
            'bon-commandes': 'Bon Commandes',
            'bon-livraisons': 'Bon Livraisons',
            'factures': 'Factures Fournisseurs',
            'reglements': 'Règlements',
            'fournisseurs': 'Gestion des Fournisseurs'
        };
        document.getElementById('pageTitle').textContent = titles[page] || page;

        // Refresh data
        refreshCurrentPage();
    }

    function refreshCurrentPage() {
        switch (currentPage) {
            case 'offres-prix': renderOffresPrix(); break;
            case 'bon-commandes': renderBonCommandes(); break;
            case 'bon-livraisons': renderBonLivraisons(); break;
            case 'factures': renderFactures(); break;
            case 'reglements': renderReglements(); break;
            case 'fournisseurs': renderFournisseurs(); break;
        }
    }

    // ==================== OFFRES DE PRIX ====================
    function renderOffresPrix() {
        const offres = SuppliersModule.getPriceQuotes();
        const tbody = document.getElementById('offresBody');
        if (!tbody) return;

        tbody.innerHTML = offres.map(o => {
            const fournisseur = SuppliersModule.getSupplierById(o.fournisseurId);
            return `
                <tr>
                    <td>${o.id}</td>
                    <td>${o.date}</td>
                    <td>${fournisseur?.nom || '-'}</td>
                    <td>${o.description || '-'}</td>
                    <td>${o.montantEstime || 0} TND</td>
                    <td><span class="status-badge status-${o.statut?.toLowerCase().replace(' ', '-')}">${o.statut}</span></td>
                    <td>
                        <button class="btn-icon" onclick="AchatLocalModule.editOffre('${o.id}')">✏️</button>
                        <button class="btn-icon" onclick="AchatLocalModule.deleteOffre('${o.id}')">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function openOffreModal(offreId = null) {
        const offre = offreId ? SuppliersModule.getPriceQuotes().find(o => o.id === offreId) : null;
        const suppliers = SuppliersModule.getSuppliers();

        const supplierOptions = suppliers.map(s =>
            `<option value="${s.id}" ${offre?.fournisseurId === s.id ? 'selected' : ''}>${s.nom}</option>`
        ).join('');

        document.getElementById('modalTitle').textContent = offre ? 'Modifier Demande' : 'Nouvelle Demande Offre de Prix';
        document.getElementById('modalBody').innerHTML = `
            <form id="offreForm">
                <input type="hidden" id="offreId" value="${offre?.id || ''}">
                <div class="form-row">
                    <div class="form-group">
                        <label>Date</label>
                        <input type="date" id="offreDate" value="${offre?.date || new Date().toISOString().split('T')[0]}" required>
                    </div>
                    <div class="form-group">
                        <label>Fournisseur</label>
                        <select id="offreFournisseur" required>
                            <option value="">-- Sélectionner --</option>
                            ${supplierOptions}
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <input type="text" id="offreDescription" value="${offre?.description || ''}" placeholder="Ex: Vidange complète camion">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Montant Estimé (TND)</label>
                        <input type="number" id="offreMontant" value="${offre?.montantEstime || ''}" step="0.1">
                    </div>
                    <div class="form-group">
                        <label>Statut</label>
                        <select id="offreStatut">
                            <option value="En cours" ${offre?.statut === 'En cours' ? 'selected' : ''}>En cours</option>
                            <option value="Validée" ${offre?.statut === 'Validée' ? 'selected' : ''}>Validée</option>
                            <option value="Rejetée" ${offre?.statut === 'Rejetée' ? 'selected' : ''}>Rejetée</option>
                        </select>
                    </div>
                </div>
            </form>
        `;
        document.getElementById('modalSave').onclick = saveOffre;
        App.showModal();
    }

    function saveOffre() {
        const offre = {
            id: document.getElementById('offreId').value || null,
            date: document.getElementById('offreDate').value,
            fournisseurId: document.getElementById('offreFournisseur').value,
            description: document.getElementById('offreDescription').value,
            montantEstime: parseFloat(document.getElementById('offreMontant').value) || 0,
            statut: document.getElementById('offreStatut').value
        };
        SuppliersModule.savePriceQuote(offre);
        App.hideModal();
        renderOffresPrix();
    }

    function editOffre(id) { openOffreModal(id); }
    function deleteOffre(id) {
        if (confirm('Supprimer cette demande?')) {
            SuppliersModule.deletePriceQuote(id);
            renderOffresPrix();
        }
    }

    // ==================== BON COMMANDES ====================
    function renderBonCommandes() {
        const commandes = SuppliersModule.getPurchaseOrders();
        const tbody = document.getElementById('commandesBody');
        if (!tbody) return;

        tbody.innerHTML = commandes.map(c => {
            const fournisseur = SuppliersModule.getSupplierById(c.fournisseurId);
            const truck = window.DataModule?.getTruckById?.(c.camionId);
            return `
                <tr>
                    <td>${c.numero || c.id}</td>
                    <td>${c.date}</td>
                    <td>${fournisseur?.nom || '-'}</td>
                    <td>${truck?.matricule || '-'}</td>
                    <td>${c.maintenanceType || '-'}</td>
                    <td>${c.montantTotal || 0} TND</td>
                    <td><span class="status-badge status-${c.statut?.toLowerCase().replace(' ', '-')}">${c.statut}</span></td>
                    <td>
                        <button class="btn-icon" onclick="AchatLocalModule.editCommande('${c.id}')">✏️</button>
                        ${c.statut === 'En cours' ? `<button class="btn-icon" onclick="AchatLocalModule.transformToBL('${c.id}')" title="Transformer en BL">📦</button>` : ''}
                        <button class="btn-icon" onclick="AchatLocalModule.deleteCommande('${c.id}')">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function openCommandeModal(commandeId = null) {
        const commande = commandeId ? SuppliersModule.getPurchaseOrderById(commandeId) : null;
        const suppliers = SuppliersModule.getSuppliers();
        const trucks = window.DataModule?.getTrucks?.() || [];

        const supplierOptions = suppliers.map(s =>
            `<option value="${s.id}" ${commande?.fournisseurId === s.id ? 'selected' : ''}>${s.nom}</option>`
        ).join('');

        const truckOptions = trucks.map(t =>
            `<option value="${t.id}" ${commande?.camionId === t.id ? 'selected' : ''}>${t.matricule}</option>`
        ).join('');

        document.getElementById('modalTitle').textContent = commande ? 'Modifier Bon Commande' : 'Nouveau Bon Commande';
        document.getElementById('modalBody').innerHTML = `
            <form id="commandeForm">
                <input type="hidden" id="commandeId" value="${commande?.id || ''}">
                <div class="form-row">
                    <div class="form-group">
                        <label>N° BC</label>
                        <input type="text" id="commandeNumero" value="${commande?.numero || ''}" placeholder="Auto-généré si vide">
                    </div>
                    <div class="form-group">
                        <label>Date</label>
                        <input type="date" id="commandeDate" value="${commande?.date || new Date().toISOString().split('T')[0]}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Fournisseur</label>
                        <select id="commandeFournisseur" required>
                            <option value="">-- Sélectionner --</option>
                            ${supplierOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Camion (pour maintenance)</label>
                        <select id="commandeCamion">
                            <option value="">-- Optionnel --</option>
                            ${truckOptions}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Type Maintenance</label>
                        <select id="commandeMaintenance">
                            <option value="">-- Non applicable --</option>
                            <option value="Vidange" ${commande?.maintenanceType === 'Vidange' ? 'selected' : ''}>Vidange</option>
                            <option value="Pneus" ${commande?.maintenanceType === 'Pneus' ? 'selected' : ''}>Pneus</option>
                            <option value="Freins" ${commande?.maintenanceType === 'Freins' ? 'selected' : ''}>Freins</option>
                            <option value="Moteur" ${commande?.maintenanceType === 'Moteur' ? 'selected' : ''}>Moteur</option>
                            <option value="Carrosserie" ${commande?.maintenanceType === 'Carrosserie' ? 'selected' : ''}>Carrosserie</option>
                            <option value="Autre" ${commande?.maintenanceType === 'Autre' ? 'selected' : ''}>Autre</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Montant Total (TND)</label>
                        <input type="number" id="commandeMontant" value="${commande?.montantTotal || ''}" step="0.1">
                    </div>
                </div>
                <div class="form-group">
                    <label>Articles / Description</label>
                    <textarea id="commandeArticles" rows="3" placeholder="Ex: Huile moteur 20L, Filtre à huile x2...">${commande?.articles?.map(a => `${a.nom} x${a.quantite}`).join(', ') || ''}</textarea>
                </div>
            </form>
        `;
        document.getElementById('modalSave').onclick = saveCommande;
        App.showModal();
    }

    function saveCommande() {
        const articlesText = document.getElementById('commandeArticles').value;
        const articles = articlesText.split(',').map(a => {
            const parts = a.trim().split(' x');
            return { nom: parts[0], quantite: parseInt(parts[1]) || 1 };
        }).filter(a => a.nom);

        const commande = {
            id: document.getElementById('commandeId').value || null,
            numero: document.getElementById('commandeNumero').value || null,
            date: document.getElementById('commandeDate').value,
            fournisseurId: document.getElementById('commandeFournisseur').value,
            camionId: document.getElementById('commandeCamion').value || null,
            maintenanceType: document.getElementById('commandeMaintenance').value || null,
            montantTotal: parseFloat(document.getElementById('commandeMontant').value) || 0,
            articles: articles,
            statut: 'En cours'
        };
        SuppliersModule.savePurchaseOrder(commande);
        App.hideModal();
        renderBonCommandes();
    }

    function editCommande(id) { openCommandeModal(id); }
    function deleteCommande(id) {
        if (confirm('Supprimer ce bon commande?')) {
            SuppliersModule.deletePurchaseOrder(id);
            renderBonCommandes();
        }
    }

    function transformToBL(commandeId) {
        if (confirm('Transformer ce BC en Bon Livraison?')) {
            SuppliersModule.transformToDeliveryNote(commandeId);
            renderBonCommandes();
            alert('Bon Livraison créé avec succès!');
        }
    }

    // ==================== BON LIVRAISONS ====================
    function renderBonLivraisons() {
        const livraisons = SuppliersModule.getDeliveryNotes();
        const tbody = document.getElementById('livraisonsBody');
        if (!tbody) return;

        tbody.innerHTML = livraisons.map(l => {
            const fournisseur = SuppliersModule.getSupplierById(l.fournisseurId);
            const truck = window.DataModule?.getTruckById?.(l.camionId);
            return `
                <tr>
                    <td>${l.id}</td>
                    <td>${l.date}</td>
                    <td>${l.poNumber || l.poId || '-'}</td>
                    <td>${fournisseur?.nom || '-'}</td>
                    <td>${l.depot || '-'}</td>
                    <td>${truck?.matricule || '-'}</td>
                    <td><span class="status-badge status-${l.statut?.toLowerCase()}">${l.statut}</span></td>
                    <td>
                        <button class="btn-icon" onclick="AchatLocalModule.editLivraison('${l.id}')">✏️</button>
                        <button class="btn-icon" onclick="AchatLocalModule.deleteLivraison('${l.id}')">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function openLivraisonModal(livraisonId = null) {
        const livraison = livraisonId ? SuppliersModule.getDeliveryNoteById(livraisonId) : null;

        document.getElementById('modalTitle').textContent = livraison ? 'Modifier BL' : 'Nouveau Bon Livraison';
        document.getElementById('modalBody').innerHTML = `
            <form id="livraisonForm">
                <input type="hidden" id="livraisonId" value="${livraison?.id || ''}">
                <div class="form-row">
                    <div class="form-group">
                        <label>N° BL</label>
                        <input type="text" value="${livraison?.id || ''}" disabled>
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
            </form>
        `;
        document.getElementById('modalSave').onclick = saveLivraison;
        App.showModal();
    }

    function saveLivraison() {
        const livraison = SuppliersModule.getDeliveryNoteById(document.getElementById('livraisonId').value);
        if (livraison) {
            livraison.date = document.getElementById('livraisonDate').value;
            livraison.depot = document.getElementById('livraisonDepot').value;
            SuppliersModule.saveDeliveryNote(livraison);
        }
        App.hideModal();
        renderBonLivraisons();
    }

    function editLivraison(id) { openLivraisonModal(id); }
    function deleteLivraison(id) {
        if (confirm('Supprimer ce bon livraison?')) {
            SuppliersModule.deleteDeliveryNote(id);
            renderBonLivraisons();
        }
    }

    // ==================== FACTURES ====================
    function renderFactures() {
        const factures = SuppliersModule.getSupplierInvoices();
        const tbody = document.getElementById('facturesBody');
        if (!tbody) return;

        let totalNonPaye = 0;
        let totalPaye = 0;

        tbody.innerHTML = factures.map(f => {
            const fournisseur = SuppliersModule.getSupplierById(f.fournisseurId);
            const montant = parseFloat(f.montant) || 0;
            const regle = parseFloat(f.montantRegle) || 0;

            if (f.etat === 'Payée') totalPaye += montant;
            else totalNonPaye += (montant - regle);

            return `
                <tr>
                    <td>${f.id}</td>
                    <td>${f.date}</td>
                    <td>${fournisseur?.nom || '-'}</td>
                    <td>${f.numeroFournisseur || '-'}</td>
                    <td>${montant.toFixed(3)} TND</td>
                    <td>${regle.toFixed(3)} TND</td>
                    <td><span class="status-badge status-${f.etat?.toLowerCase().replace(' ', '-').replace('é', 'e')}">${f.etat}</span></td>
                    <td>
                        <button class="btn-icon" onclick="AchatLocalModule.editFacture('${f.id}')">✏️</button>
                        <button class="btn-icon" onclick="AchatLocalModule.deleteFacture('${f.id}')">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');

        // Update KPI
        const kpiNonPaye = document.getElementById('totalNonPaye');
        const kpiPaye = document.getElementById('totalPaye');
        if (kpiNonPaye) kpiNonPaye.textContent = totalNonPaye.toFixed(3) + ' TND';
        if (kpiPaye) kpiPaye.textContent = totalPaye.toFixed(3) + ' TND';
    }

    function openFactureModal(factureId = null) {
        const facture = factureId ? SuppliersModule.getSupplierInvoiceById(factureId) : null;
        const suppliers = SuppliersModule.getSuppliers();
        const bls = SuppliersModule.getDeliveryNotes();

        const supplierOptions = suppliers.map(s =>
            `<option value="${s.id}" ${facture?.fournisseurId === s.id ? 'selected' : ''}>${s.nom}</option>`
        ).join('');

        const blOptions = bls.map(l =>
            `<option value="${l.id}" ${facture?.blId === l.id ? 'selected' : ''}>${l.id} - ${l.date}</option>`
        ).join('');

        document.getElementById('modalTitle').textContent = facture ? 'Modifier Facture' : 'Nouvelle Facture Fournisseur';
        document.getElementById('modalBody').innerHTML = `
            <form id="factureForm">
                <input type="hidden" id="factureId" value="${facture?.id || ''}">
                <div class="form-row">
                    <div class="form-group">
                        <label>Date Facture</label>
                        <input type="date" id="factureDate" value="${facture?.date || new Date().toISOString().split('T')[0]}" required>
                    </div>
                    <div class="form-group">
                        <label>N° Facture Fournisseur</label>
                        <input type="text" id="factureNumero" value="${facture?.numeroFournisseur || ''}" placeholder="Ex: FACT-2026-001">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Fournisseur</label>
                        <select id="factureFournisseur" required>
                            <option value="">-- Sélectionner --</option>
                            ${supplierOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>BL Lié (optionnel)</label>
                        <select id="factureBL">
                            <option value="">-- Sélectionner --</option>
                            ${blOptions}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Montant Total (TND)</label>
                        <input type="number" id="factureMontant" value="${facture?.montant || ''}" step="0.001" required>
                    </div>
                    <div class="form-group">
                        <label>Type Paiement</label>
                        <select id="factureTypePaiement">
                            <option value="Par Échéance" ${facture?.typePaiement === 'Par Échéance' ? 'selected' : ''}>Par Échéance</option>
                            <option value="En Espèce" ${facture?.typePaiement === 'En Espèce' ? 'selected' : ''}>En Espèce</option>
                            <option value="Virement" ${facture?.typePaiement === 'Virement' ? 'selected' : ''}>Virement</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Montant Réglé (TND)</label>
                        <input type="number" id="factureRegle" value="${facture?.montantRegle || '0'}" step="0.001">
                    </div>
                    <div class="form-group">
                        <label>État</label>
                        <select id="factureEtat">
                            <option value="Non Payée" ${facture?.etat === 'Non Payée' ? 'selected' : ''}>Non Payée</option>
                            <option value="Payée" ${facture?.etat === 'Payée' ? 'selected' : ''}>Payée</option>
                            <option value="Partiel" ${facture?.etat === 'Partiel' ? 'selected' : ''}>Partiel</option>
                        </select>
                    </div>
                </div>
            </form>
        `;
        document.getElementById('modalSave').onclick = saveFacture;
        App.showModal();
    }

    function saveFacture() {
        const facture = {
            id: document.getElementById('factureId').value || null,
            date: document.getElementById('factureDate').value,
            numeroFournisseur: document.getElementById('factureNumero').value,
            fournisseurId: document.getElementById('factureFournisseur').value,
            blId: document.getElementById('factureBL').value || null,
            montant: parseFloat(document.getElementById('factureMontant').value) || 0,
            typePaiement: document.getElementById('factureTypePaiement').value,
            montantRegle: parseFloat(document.getElementById('factureRegle').value) || 0,
            etat: document.getElementById('factureEtat').value
        };
        SuppliersModule.saveSupplierInvoice(facture);
        App.hideModal();
        renderFactures();
    }

    function editFacture(id) { openFactureModal(id); }
    function deleteFacture(id) {
        if (confirm('Supprimer cette facture?')) {
            SuppliersModule.deleteSupplierInvoice(id);
            renderFactures();
        }
    }

    // ==================== REGLEMENTS ====================
    function renderReglements() {
        const tbody = document.getElementById('reglementsBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;">Module Règlements - En développement</td></tr>';
    }

    function openReglementModal() {
        alert('Module Règlements - En développement');
    }

    // ==================== FOURNISSEURS ====================
    function renderFournisseurs() {
        const suppliers = SuppliersModule.getSuppliers();
        const grid = document.getElementById('fournisseursGrid');
        if (!grid) return;

        grid.innerHTML = suppliers.map(s => {
            const stats = SuppliersModule.getSupplierStats(s.id);
            return `
                <div class="card">
                    <div class="card-header">
                        <h3>${s.nom}</h3>
                        <span class="badge">${s.type || 'Fournisseur'}</span>
                    </div>
                    <div class="card-body">
                        <p><strong>Code:</strong> ${s.code || '-'}</p>
                        <p><strong>Téléphone:</strong> ${s.tel || '-'}</p>
                        <p><strong>Email:</strong> ${s.email || '-'}</p>
                        <hr style="margin: 12px 0; border-color: rgba(148,163,184,0.2);">
                        <p><strong>Total Factures:</strong> ${stats.totalFactures.toFixed(3)} TND</p>
                        <p><strong>Total Payé:</strong> ${stats.totalPaye.toFixed(3)} TND</p>
                        <p><strong>Reste dû:</strong> ${stats.totalDu.toFixed(3)} TND</p>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-small" onclick="AchatLocalModule.editFournisseur('${s.id}')">✏️ Modifier</button>
                        <button class="btn btn-small btn-danger" onclick="AchatLocalModule.deleteFournisseur('${s.id}')">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function openFournisseurModal(fournisseurId = null) {
        const f = fournisseurId ? SuppliersModule.getSupplierById(fournisseurId) : null;

        document.getElementById('modalTitle').textContent = f ? 'Modifier Fournisseur' : 'Nouveau Fournisseur';
        document.getElementById('modalBody').innerHTML = `
            <form id="fournisseurForm">
                <input type="hidden" id="fournisseurId" value="${f?.id || ''}">
                <div class="form-row">
                    <div class="form-group">
                        <label>Code</label>
                        <input type="text" id="fournisseurCode" value="${f?.code || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Nom</label>
                        <input type="text" id="fournisseurNom" value="${f?.nom || ''}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select id="fournisseurType">
                        <option value="">-- Sélectionner --</option>
                        <option value="Pièces détachées" ${f?.type === 'Pièces détachées' ? 'selected' : ''}>Pièces détachées</option>
                        <option value="Fournitures" ${f?.type === 'Fournitures' ? 'selected' : ''}>Fournitures</option>
                        <option value="Carburant" ${f?.type === 'Carburant' ? 'selected' : ''}>Carburant</option>
                        <option value="Mécanique" ${f?.type === 'Mécanique' ? 'selected' : ''}>Mécanique</option>
                        <option value="Pneumatique" ${f?.type === 'Pneumatique' ? 'selected' : ''}>Pneumatique</option>
                        <option value="Autre" ${f?.type === 'Autre' ? 'selected' : ''}>Autre</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Téléphone</label>
                        <input type="tel" id="fournisseurTel" value="${f?.tel || ''}">
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="fournisseurEmail" value="${f?.email || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Adresse</label>
                    <textarea id="fournisseurAdresse" rows="2">${f?.adresse || ''}</textarea>
                </div>
            </form>
        `;
        document.getElementById('modalSave').onclick = saveFournisseur;
        App.showModal();
    }

    function saveFournisseur() {
        const fournisseur = {
            id: document.getElementById('fournisseurId').value || null,
            code: document.getElementById('fournisseurCode').value,
            nom: document.getElementById('fournisseurNom').value,
            type: document.getElementById('fournisseurType').value,
            tel: document.getElementById('fournisseurTel').value,
            email: document.getElementById('fournisseurEmail').value,
            adresse: document.getElementById('fournisseurAdresse').value
        };
        SuppliersModule.saveSupplier(fournisseur);
        App.hideModal();
        renderFournisseurs();
    }

    function editFournisseur(id) { openFournisseurModal(id); }
    function deleteFournisseur(id) {
        if (confirm('Supprimer ce fournisseur?')) {
            SuppliersModule.deleteSupplier(id);
            renderFournisseurs();
        }
    }

    // Export
    return {
        init,
        showPage,
        // Offres
        editOffre,
        deleteOffre,
        // Commandes
        editCommande,
        deleteCommande,
        transformToBL,
        // Livraisons
        editLivraison,
        deleteLivraison,
        // Factures
        editFacture,
        deleteFacture,
        // Fournisseurs
        editFournisseur,
        deleteFournisseur,
        // Link to trucks
        getMaintenanceByTruck: SuppliersModule.getMaintenanceByTruck
    };
})();

// Initialize
if (typeof window !== 'undefined') {
    window.AchatLocalModule = AchatLocalModule;
    document.addEventListener('DOMContentLoaded', () => AchatLocalModule.init());
}
