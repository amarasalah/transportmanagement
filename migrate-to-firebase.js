/**
 * Firebase Migration Script
 * Run with: node migrate-to-firebase.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, getDocs, deleteDoc } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyDrQgC8-T9H8l4VGVs1paCD2pqQT4XypiY",
    authDomain: "amaratransports.firebaseapp.com",
    projectId: "amaratransports",
    storageBucket: "amaratransports.firebasestorage.app",
    messagingSenderId: "991257288526",
    appId: "1:991257288526:web:f5b1c8e27e79f3f5dc2a7a",
    measurementId: "G-VG1S2Q4EZL"
};

// Default settings
const DEFAULT_SETTINGS = {
    defaultFuelPrice: 2,
    currency: 'TND'
};

// Pre-loaded trucks from Excel
const DEFAULT_TRUCKS = [
    { id: 't1', matricule: '8565 TU 257', type: 'PLATEAU', chargesFixes: 400, montantAssurance: 32, montantTaxe: 20, chargePersonnel: 80 },
    { id: 't2', matricule: '8563 TU 257', type: 'PLATEAU', chargesFixes: 400, montantAssurance: 32, montantTaxe: 20, chargePersonnel: 80 },
    { id: 't3', matricule: '5305 TU 236', type: 'PLATEAU', chargesFixes: 80, montantAssurance: 20, montantTaxe: 20, chargePersonnel: 80 },
    { id: 't4', matricule: '924 TU 98', type: 'PLATEAU', chargesFixes: 80, montantAssurance: 20, montantTaxe: 20, chargePersonnel: 80 },
    { id: 't5', matricule: '6980 TU 101', type: 'PLATEAU', chargesFixes: 80, montantAssurance: 20, montantTaxe: 20, chargePersonnel: 80 },
    { id: 't6', matricule: '7775 TU 252', type: 'PLATEAU', chargesFixes: 400, montantAssurance: 20, montantTaxe: 20, chargePersonnel: 80 },
    { id: 't7', matricule: '4176 TU 250', type: 'PLATEAU', chargesFixes: 400, montantAssurance: 32, montantTaxe: 20, chargePersonnel: 80 },
    { id: 't8', matricule: '3380 TU 104', type: 'PLATEAU', chargesFixes: 80, montantAssurance: 20, montantTaxe: 20, chargePersonnel: 80 },
    { id: 't9', matricule: '446 TU 228', type: 'PLATEAU', chargesFixes: 80, montantAssurance: 20, montantTaxe: 20, chargePersonnel: 80 },
    { id: 't10', matricule: '7243 TU 75', type: 'PLATEAU', chargesFixes: 80, montantAssurance: 20, montantTaxe: 20, chargePersonnel: 80 },
    { id: 't11', matricule: '4188 TU 80', type: 'PLATEAU', chargesFixes: 80, montantAssurance: 20, montantTaxe: 20, chargePersonnel: 80 },
    { id: 't12', matricule: '2318 TU 155', type: 'BENNE', chargesFixes: 80, montantAssurance: 20, montantTaxe: 20, chargePersonnel: 80 },
    { id: 't13', matricule: '788 TU 99', type: 'BENNE', chargesFixes: 80, montantAssurance: 20, montantTaxe: 20, chargePersonnel: 80 },
    { id: 't14', matricule: '8564 TU 257', type: 'BENNE', chargesFixes: 400, montantAssurance: 32, montantTaxe: 20, chargePersonnel: 80 },
    { id: 't15', matricule: '8566 TU 257', type: 'BENNE', chargesFixes: 400, montantAssurance: 32, montantTaxe: 20, chargePersonnel: 80 }
];

// Pre-loaded drivers from Excel
const DEFAULT_DRIVERS = [
    { id: 'd1', nom: 'CHOKAIRI', camionId: 't1' },
    { id: 'd2', nom: 'LASSAD CHATAOUI', camionId: 't2' },
    { id: 'd3', nom: 'HAMZA', camionId: 't3' },
    { id: 'd4', nom: 'IKRAMI', camionId: 't4' },
    { id: 'd5', nom: 'ABDELBARI', camionId: 't5' },
    { id: 'd6', nom: 'JAMIL', camionId: 't6' },
    { id: 'd7', nom: 'HEDI', camionId: 't7' },
    { id: 'd8', nom: 'MALEK', camionId: 't8' },
    { id: 'd9', nom: 'LASSAD AMRI', camionId: 't10' },
    { id: 'd10', nom: 'SAMI', camionId: 't11' },
    { id: 'd11', nom: 'KAMEL CH', camionId: 't12' },
    { id: 'd12', nom: 'KAMEL ZAY', camionId: 't13' },
    { id: 'd13', nom: 'CHOKRI THAMER', camionId: 't14' },
    { id: 'd14', nom: 'HSAN REBII', camionId: 't15' }
];

// Sample entries from Excel
const DEFAULT_ENTRIES = [
    { id: 'e1', date: '2026-02-02', camionId: 't1', chauffeurId: 'd1', destination: 'TUNIS', kilometrage: 800, quantiteGasoil: 240, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 500, remarques: '' },
    { id: 'e2', date: '2026-02-02', camionId: 't2', chauffeurId: 'd2', destination: 'TUNIS', kilometrage: 800, quantiteGasoil: 240, prixGasoilLitre: 2, maintenance: 1070, prixLivraison: 500, remarques: 'VIDANGE' },
    { id: 'e3', date: '2026-02-02', camionId: 't3', chauffeurId: 'd3', destination: 'SOUSSE', kilometrage: 300, quantiteGasoil: 120, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 590, remarques: '' },
    { id: 'e4', date: '2026-02-02', camionId: 't4', chauffeurId: 'd4', destination: 'DJERBA', kilometrage: 340, quantiteGasoil: 120, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 590, remarques: '' },
    { id: 'e5', date: '2026-02-02', camionId: 't5', chauffeurId: 'd5', destination: 'KEBILI/GABES', kilometrage: 434, quantiteGasoil: 125, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 650, remarques: '' },
    { id: 'e6', date: '2026-02-02', camionId: 't6', chauffeurId: 'd6', destination: 'MEHDIA/TUNIS', kilometrage: 1220, quantiteGasoil: 360, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 1090, remarques: '' },
    { id: 'e7', date: '2026-02-02', camionId: 't7', chauffeurId: 'd7', destination: 'TUNIS', kilometrage: 800, quantiteGasoil: 240, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 500, remarques: '' },
    { id: 'e8', date: '2026-02-02', camionId: 't10', chauffeurId: 'd9', destination: 'OUDHREF', kilometrage: 80, quantiteGasoil: 30, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 200, remarques: '' },
    { id: 'e9', date: '2026-02-02', camionId: 't12', chauffeurId: 'd11', destination: 'CHAGRA/CHAGRA', kilometrage: 200, quantiteGasoil: 65, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 500, remarques: '' },
    { id: 'e10', date: '2026-02-02', camionId: 't14', chauffeurId: 'd13', destination: 'FAIEDH/SP/2SB', kilometrage: 400, quantiteGasoil: 135, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 980, remarques: '' },
    { id: 'e11', date: '2026-02-02', camionId: 't15', chauffeurId: 'd14', destination: 'FAIEDH/SP/2SB', kilometrage: 400, quantiteGasoil: 135, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 980, remarques: '' },
    // 03-02-26 entries
    { id: 'e12', date: '2026-02-03', camionId: 't2', chauffeurId: 'd2', destination: 'GAFSSA', kilometrage: 300, quantiteGasoil: 90, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 600, remarques: '' },
    { id: 'e13', date: '2026-02-03', camionId: 't3', chauffeurId: 'd3', destination: 'ZARZIS', kilometrage: 414, quantiteGasoil: 145, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 524, remarques: '' },
    { id: 'e14', date: '2026-02-03', camionId: 't4', chauffeurId: 'd4', destination: 'DJERBA', kilometrage: 380, quantiteGasoil: 120, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 553, remarques: '' },
    { id: 'e15', date: '2026-02-03', camionId: 't5', chauffeurId: 'd5', destination: 'ELHAMMA', kilometrage: 180, quantiteGasoil: 40, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 234, remarques: '' },
    { id: 'e16', date: '2026-02-03', camionId: 't10', chauffeurId: 'd9', destination: 'OUDHREF', kilometrage: 80, quantiteGasoil: 30, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 200, remarques: '' },
    { id: 'e17', date: '2026-02-03', camionId: 't12', chauffeurId: 'd11', destination: 'CHAGRA/SB', kilometrage: 320, quantiteGasoil: 120, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 800, remarques: '' },
    { id: 'e18', date: '2026-02-03', camionId: 't14', chauffeurId: 'd13', destination: 'FAIEDH/SP/2SB', kilometrage: 300, quantiteGasoil: 100, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 960, remarques: '' },
    { id: 'e19', date: '2026-02-03', camionId: 't15', chauffeurId: 'd14', destination: 'FAIEDH/SP/2SB', kilometrage: 300, quantiteGasoil: 100, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 960, remarques: '' },
    // 04-02-26 entries
    { id: 'e20', date: '2026-02-04', camionId: 't1', chauffeurId: 'd1', destination: 'ZARZIS', kilometrage: 414, quantiteGasoil: 125, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 524, remarques: '' },
    { id: 'e21', date: '2026-02-04', camionId: 't2', chauffeurId: 'd2', destination: 'TUNIS', kilometrage: 414, quantiteGasoil: 125, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 524, remarques: '' },
    { id: 'e22', date: '2026-02-04', camionId: 't4', chauffeurId: 'd4', destination: 'DJERBA', kilometrage: 380, quantiteGasoil: 120, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 553, remarques: '' },
    { id: 'e23', date: '2026-02-04', camionId: 't5', chauffeurId: 'd5', destination: 'GABES', kilometrage: 140, quantiteGasoil: 40, prixGasoilLitre: 2, maintenance: 420, prixLivraison: 234, remarques: '' },
    { id: 'e24', date: '2026-02-04', camionId: 't7', chauffeurId: 'd7', destination: 'BENGUERDENE', kilometrage: 440, quantiteGasoil: 140, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 670, remarques: '' },
    { id: 'e25', date: '2026-02-04', camionId: 't12', chauffeurId: 'd11', destination: 'CHAGRA/SB', kilometrage: 320, quantiteGasoil: 120, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 800, remarques: '' },
    { id: 'e26', date: '2026-02-04', camionId: 't14', chauffeurId: 'd13', destination: 'FAIEDH/SP/2SB', kilometrage: 400, quantiteGasoil: 135, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 980, remarques: '' },
    { id: 'e27', date: '2026-02-04', camionId: 't15', chauffeurId: 'd14', destination: 'FAIEDH/SP/2SB', kilometrage: 400, quantiteGasoil: 135, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 980, remarques: '' },
    // 05-02-26 entries
    { id: 'e28', date: '2026-02-05', camionId: 't1', chauffeurId: 'd1', destination: 'GHANOUCH', kilometrage: 130, quantiteGasoil: 40, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 234, remarques: '' },
    { id: 'e29', date: '2026-02-05', camionId: 't2', chauffeurId: 'd2', destination: 'DJERBA', kilometrage: 380, quantiteGasoil: 110, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 591, remarques: '' },
    { id: 'e30', date: '2026-02-05', camionId: 't4', chauffeurId: 'd4', destination: 'DJERBA', kilometrage: 380, quantiteGasoil: 120, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 591, remarques: '' },
    { id: 'e31', date: '2026-02-05', camionId: 't6', chauffeurId: 'd6', destination: 'GABES/DJERBA', kilometrage: 520, quantiteGasoil: 160, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 841, remarques: '' },
    { id: 'e32', date: '2026-02-05', camionId: 't7', chauffeurId: 'd7', destination: 'MAHDIA', kilometrage: 450, quantiteGasoil: 140, prixGasoilLitre: 2, maintenance: 1546, prixLivraison: 590, remarques: 'VIDANGE' },
    { id: 'e33', date: '2026-02-05', camionId: 't12', chauffeurId: 'd11', destination: 'CHAGRA/SB', kilometrage: 320, quantiteGasoil: 120, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 800, remarques: '' },
    { id: 'e34', date: '2026-02-05', camionId: 't14', chauffeurId: 'd13', destination: 'SUDB/SB/HICHA/SP', kilometrage: 200, quantiteGasoil: 60, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 800, remarques: '' },
    { id: 'e35', date: '2026-02-05', camionId: 't15', chauffeurId: 'd14', destination: 'FAYEDH/FAYEDH', kilometrage: 300, quantiteGasoil: 100, prixGasoilLitre: 2, maintenance: 0, prixLivraison: 960, remarques: '' }
];

async function migrate() {
    console.log('🚀 Démarrage de la migration vers Firebase...\n');

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    try {
        // Upload trucks
        console.log(`📦 Importation de ${DEFAULT_TRUCKS.length} camions...`);
        for (const truck of DEFAULT_TRUCKS) {
            await setDoc(doc(db, 'trucks', truck.id), truck);
            process.stdout.write('.');
        }
        console.log(' ✅');

        // Upload drivers
        console.log(`👤 Importation de ${DEFAULT_DRIVERS.length} chauffeurs...`);
        for (const driver of DEFAULT_DRIVERS) {
            await setDoc(doc(db, 'drivers', driver.id), driver);
            process.stdout.write('.');
        }
        console.log(' ✅');

        // Upload entries
        console.log(`📝 Importation de ${DEFAULT_ENTRIES.length} saisies...`);
        for (const entry of DEFAULT_ENTRIES) {
            await setDoc(doc(db, 'entries', entry.id), entry);
            process.stdout.write('.');
        }
        console.log(' ✅');

        // Upload settings
        console.log('⚙️ Importation des paramètres...');
        await setDoc(doc(db, 'settings', 'default'), DEFAULT_SETTINGS);
        console.log(' ✅');

        console.log('\n========================================');
        console.log('✅ MIGRATION TERMINÉE AVEC SUCCÈS!');
        console.log('========================================');
        console.log(`   📦 ${DEFAULT_TRUCKS.length} camions`);
        console.log(`   👤 ${DEFAULT_DRIVERS.length} chauffeurs`);
        console.log(`   📝 ${DEFAULT_ENTRIES.length} saisies`);
        console.log(`   ⚙️ 1 configuration`);
        console.log('========================================\n');
        console.log('Vous pouvez maintenant ouvrir index.html');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Erreur:', error.message);
        process.exit(1);
    }
}

migrate();
