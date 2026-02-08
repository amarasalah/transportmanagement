/**
 * ARTICLES MODULE - FIREBASE VERSION
 * Gestion des Produits/Articles
 */

import { db, collection, doc, getDocs, setDoc, deleteDoc, COLLECTIONS } from './firebase.js';

let cache = [];

async function init() {
    document.getElementById('addArticleBtn')?.addEventListener('click', () => openModal());
    await loadArticles();
}

async function loadArticles() {
    try {
        const snap = await getDocs(collection(db, COLLECTIONS.articles));
        cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        return cache;
    } catch (error) {
        console.error('Error loading articles:', error);
        return [];
    }
}

async function getArticles() {
    if (cache.length === 0) await loadArticles();
    return cache;
}

function getArticleById(id) {
    return cache.find(a => a.id === id);
}

function getArticleByRef(ref) {
    return cache.find(a => a.reference === ref);
}

async function refresh() {
    await loadArticles();
    await renderArticles();
}

function generateReference() {
    const num = String(cache.length + 1).padStart(6, '0');
    return `ART${num}`;
}

async function renderArticles() {
    const articles = await getArticles();
    const container = document.getElementById('articlesTable');
    if (!container) return;

    if (articles.length === 0) {
        container.innerHTML = '<tr><td colspan="8" class="empty-state">Aucun article</td></tr>';
        return;
    }

    container.innerHTML = articles.map(a => `
        <tr>
            <td><strong>${a.reference}</strong></td>
            <td>${a.designation}</td>
            <td>${a.categorie || '-'}</td>
            <td>${a.unite || 'Unité'}</td>
            <td>${(a.prixAchat || 0).toLocaleString('fr-FR')} TND</td>
            <td>${(a.prixVente || 0).toLocaleString('fr-FR')} TND</td>
            <td class="${a.stock > 10 ? 'result-positive' : a.stock > 0 ? 'result-warning' : 'result-negative'}">
                ${a.stock || 0}
            </td>
            <td>
                <button class="btn btn-sm btn-outline" onclick="ArticlesModule.edit('${a.id}')">✏️</button>
                <button class="btn btn-sm btn-outline" onclick="ArticlesModule.remove('${a.id}')">🗑️</button>
            </td>
        </tr>
    `).join('');
}

async function openModal(articleId = null) {
    const article = articleId ? getArticleById(articleId) : null;
    const title = article ? 'Modifier Article' : 'Nouvel Article';
    const ref = article?.reference || generateReference();

    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = `
        <form id="articleForm">
            <input type="hidden" id="articleId" value="${article?.id || ''}">
            <div class="form-row">
                <div class="form-group">
                    <label>Référence</label>
                    <input type="text" id="articleRef" value="${ref}" readonly>
                </div>
                <div class="form-group">
                    <label>Désignation *</label>
                    <input type="text" id="articleDesignation" value="${article?.designation || ''}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Catégorie</label>
                    <select id="articleCategorie">
                        <option value="">-- Sélectionner --</option>
                        <option value="Pièces" ${article?.categorie === 'Pièces' ? 'selected' : ''}>Pièces</option>
                        <option value="Lubrifiants" ${article?.categorie === 'Lubrifiants' ? 'selected' : ''}>Lubrifiants</option>
                        <option value="Pneus" ${article?.categorie === 'Pneus' ? 'selected' : ''}>Pneus</option>
                        <option value="Carburant" ${article?.categorie === 'Carburant' ? 'selected' : ''}>Carburant</option>
                        <option value="Autre" ${article?.categorie === 'Autre' ? 'selected' : ''}>Autre</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Unité</label>
                    <select id="articleUnite">
                        <option value="Unité" ${article?.unite === 'Unité' ? 'selected' : ''}>Unité</option>
                        <option value="Litre" ${article?.unite === 'Litre' ? 'selected' : ''}>Litre</option>
                        <option value="Kg" ${article?.unite === 'Kg' ? 'selected' : ''}>Kg</option>
                        <option value="Mètre" ${article?.unite === 'Mètre' ? 'selected' : ''}>Mètre</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Prix Achat (TND)</label>
                    <input type="number" id="articlePrixAchat" value="${article?.prixAchat || 0}" step="0.001" min="0">
                </div>
                <div class="form-group">
                    <label>Prix Vente (TND)</label>
                    <input type="number" id="articlePrixVente" value="${article?.prixVente || 0}" step="0.001" min="0">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Stock Initial</label>
                    <input type="number" id="articleStock" value="${article?.stock || 0}" min="0">
                </div>
                <div class="form-group">
                    <label>Stock Minimum</label>
                    <input type="number" id="articleStockMin" value="${article?.stockMin || 5}" min="0">
                </div>
            </div>
        </form>
    `;
    document.getElementById('modalSave').onclick = saveArticle;
    App.showModal();
}

async function saveArticle() {
    const article = {
        id: document.getElementById('articleId').value || `article_${Date.now()}`,
        reference: document.getElementById('articleRef').value,
        designation: document.getElementById('articleDesignation').value,
        categorie: document.getElementById('articleCategorie').value,
        unite: document.getElementById('articleUnite').value,
        prixAchat: parseFloat(document.getElementById('articlePrixAchat').value) || 0,
        prixVente: parseFloat(document.getElementById('articlePrixVente').value) || 0,
        stock: parseInt(document.getElementById('articleStock').value) || 0,
        stockMin: parseInt(document.getElementById('articleStockMin').value) || 5,
        updatedAt: new Date().toISOString()
    };

    if (!article.designation) {
        alert('La désignation est obligatoire');
        return;
    }

    try {
        await setDoc(doc(db, COLLECTIONS.articles, article.id), article);
        App.hideModal();
        await refresh();
    } catch (error) {
        console.error('Error saving article:', error);
        alert('Erreur lors de l\'enregistrement');
    }
}

function edit(id) { openModal(id); }

async function remove(id) {
    if (confirm('Supprimer cet article ?')) {
        try {
            await deleteDoc(doc(db, COLLECTIONS.articles, id));
            await refresh();
        } catch (error) {
            console.error('Error deleting article:', error);
        }
    }
}

export const ArticlesModule = { init, refresh, getArticles, getArticleById, getArticleByRef, edit, remove };
window.ArticlesModule = ArticlesModule;
