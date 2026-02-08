/**
 * FIREBASE CONFIGURATION
 * Firestore Database for FleetTrack
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import {
    getFirestore,
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB4SNzrvJfnFlBnByU8cdYXPomxaoBHQB8",
    authDomain: "managementsirep.firebaseapp.com",
    projectId: "managementsirep",
    storageBucket: "managementsirep.firebasestorage.app",
    messagingSenderId: "141121672067",
    appId: "1:141121672067:web:39687e8d5020cd07e31cb6",
    measurementId: "G-V0B7ZJD2YL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Collection names - FleetTrack + ERP Modules
const COLLECTIONS = {
    // FleetTrack Core
    trucks: 'trucks',
    drivers: 'drivers',
    entries: 'entries',
    settings: 'settings',
    logs: 'activity_logs',

    // ERP Core
    suppliers: 'suppliers',
    clients: 'clients',
    articles: 'articles',
    depots: 'depots',

    // Achat Local (Purchasing)
    demandesOffrePrix: 'demandes_offre_prix',
    bonCommandesAchat: 'bon_commandes_achat',
    bonLivraisonsAchat: 'bon_livraisons_achat',
    facturesAchat: 'factures_achat',
    reglementsFournisseurs: 'reglements_fournisseurs',

    // Vente Client (Sales)
    offresPrix: 'offres_prix',
    bonCommandesVente: 'bon_commandes_vente',
    bonLivraisonsVente: 'bon_livraisons_vente',
    bonsRetour: 'bons_retour',
    facturesVente: 'factures_vente'
};

// Export for use in other modules
export {
    db,
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    COLLECTIONS
};
