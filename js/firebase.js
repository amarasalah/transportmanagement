/**
 * FIREBASE CONFIGURATION
 * Firestore Database + Auth for FleetTrack
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
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    getDatabase,
    ref as dbRef,
    push as dbPush,
    set as dbSet,
    onValue,
    onChildAdded,
    serverTimestamp as rtdbTimestamp,
    query as rtdbQuery,
    orderByChild,
    limitToLast
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyB4SNzrvJfnFlBnByU8cdYXPomxaoBHQB8",
    authDomain: "managementsirep.firebaseapp.com",
    databaseURL: "https://managementsirep-default-rtdb.europe-west1.firebasedatabase.app",
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
const auth = getAuth(app);
const rtdb = getDatabase(app);

// Collection names - FleetTrack + ERP Modules
const COLLECTIONS = {
    // Auth
    users: 'users',
    roles: 'roles',

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
    demandesAchat: 'demandes_achat',
    bonCommandesAchat: 'bon_commandes_achat',
    bonLivraisonsAchat: 'bon_livraisons_achat',
    facturesAchat: 'factures_achat',
    reglementsFournisseurs: 'reglements_fournisseurs',
    bonsSortie: 'bons_sortie_achat',
    bonsRetour: 'bons_retour_achat',

    // Vente Client (Sales)
    offresPrix: 'offres_prix',
    bonCommandesVente: 'bon_commandes_vente',
    bonLivraisonsVente: 'bon_livraisons_vente',
    devisClients: 'devis_clients',
    facturesVente: 'factures_vente',

    // Planning
    planifications: 'planifications',

    // Caisse (Treasury)
    caisse: 'caisse_transactions'
};

// R9: Sequential numbering utility
async function getNextNumber(prefix) {
    const counterDocRef = doc(db, 'counters', prefix);
    try {
        const snap = await getDoc(counterDocRef);
        let next = 1;
        if (snap.exists()) {
            next = (snap.data().next || 0) + 1;
        }
        await setDoc(counterDocRef, { next, updatedAt: new Date().toISOString() });
        const year = new Date().getFullYear().toString().slice(-2);
        return `${prefix}${year}-${String(next).padStart(4, '0')}`;
    } catch (err) {
        console.error('Error getting next number for', prefix, err);
        return `${prefix}-${Date.now().toString().slice(-6)}`;
    }
}

// Export for use in other modules
export {
    db,
    auth,
    rtdb,
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
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    // Realtime DB
    dbRef,
    dbPush,
    dbSet,
    onValue,
    onChildAdded,
    rtdbTimestamp,
    rtdbQuery,
    orderByChild,
    limitToLast,
    COLLECTIONS,
    getNextNumber
};

