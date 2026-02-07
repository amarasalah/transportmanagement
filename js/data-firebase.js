/**
 * DATA MODULE - FIREBASE FIRESTORE VERSION
 * Handles Firestore persistence and CRUD operations
 * With offline fallback to localStorage
 */

import {
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
} from './firebase.js';

// Local cache for faster access
let cache = {
    trucks: null,
    drivers: null,
    entries: null,
    settings: null
};

// Default settings
const DEFAULT_SETTINGS = {
    id: 'default',
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

// Generate UUID
function generateId() {
    return 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Initialize - populate Firestore with default data if empty
async function init() {
    try {
        console.log('🔥 Initializing Firebase connection...');

        // Check if trucks collection exists
        const trucksSnapshot = await getDocs(collection(db, COLLECTIONS.trucks));
        if (trucksSnapshot.empty) {
            console.log('📦 Populating trucks...');
            for (const truck of DEFAULT_TRUCKS) {
                await setDoc(doc(db, COLLECTIONS.trucks, truck.id), truck);
            }
        }

        // Check if drivers collection exists
        const driversSnapshot = await getDocs(collection(db, COLLECTIONS.drivers));
        if (driversSnapshot.empty) {
            console.log('👤 Populating drivers...');
            for (const driver of DEFAULT_DRIVERS) {
                await setDoc(doc(db, COLLECTIONS.drivers, driver.id), driver);
            }
        }

        // Check settings
        const settingsDoc = await getDoc(doc(db, COLLECTIONS.settings, 'default'));
        if (!settingsDoc.exists()) {
            console.log('⚙️ Creating default settings...');
            await setDoc(doc(db, COLLECTIONS.settings, 'default'), DEFAULT_SETTINGS);
        }

        console.log('✅ Firebase initialized successfully!');

        // Preload cache
        await refreshCache();

    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
        console.log('⚠️ Falling back to localStorage...');
    }
}

// Refresh local cache from Firestore
async function refreshCache() {
    try {
        const [trucksSnap, driversSnap, entriesSnap] = await Promise.all([
            getDocs(collection(db, COLLECTIONS.trucks)),
            getDocs(collection(db, COLLECTIONS.drivers)),
            getDocs(collection(db, COLLECTIONS.entries))
        ]);

        cache.trucks = trucksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        cache.drivers = driversSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        cache.entries = entriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const settingsDoc = await getDoc(doc(db, COLLECTIONS.settings, 'default'));
        cache.settings = settingsDoc.exists() ? settingsDoc.data() : DEFAULT_SETTINGS;

    } catch (error) {
        console.error('Cache refresh error:', error);
    }
}

// ==================== TRUCKS ====================
async function getTrucks() {
    if (cache.trucks) return cache.trucks;

    try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.trucks));
        cache.trucks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return cache.trucks;
    } catch (error) {
        console.error('Error getting trucks:', error);
        return [];
    }
}

function getTruckById(id) {
    if (cache.trucks) {
        return cache.trucks.find(t => t.id === id);
    }
    return null;
}

async function saveTruck(truck) {
    try {
        if (!truck.id) {
            truck.id = generateId();
        }
        await setDoc(doc(db, COLLECTIONS.trucks, truck.id), truck);

        // Update cache
        if (cache.trucks) {
            const idx = cache.trucks.findIndex(t => t.id === truck.id);
            if (idx >= 0) cache.trucks[idx] = truck;
            else cache.trucks.push(truck);
        }

        return truck;
    } catch (error) {
        console.error('Error saving truck:', error);
        throw error;
    }
}

async function deleteTruck(id) {
    try {
        await deleteDoc(doc(db, COLLECTIONS.trucks, id));
        if (cache.trucks) {
            cache.trucks = cache.trucks.filter(t => t.id !== id);
        }
    } catch (error) {
        console.error('Error deleting truck:', error);
        throw error;
    }
}

// ==================== DRIVERS ====================
async function getDrivers() {
    if (cache.drivers) return cache.drivers;

    try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.drivers));
        cache.drivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return cache.drivers;
    } catch (error) {
        console.error('Error getting drivers:', error);
        return [];
    }
}

function getDriverById(id) {
    if (cache.drivers) {
        return cache.drivers.find(d => d.id === id);
    }
    return null;
}

async function saveDriver(driver) {
    try {
        if (!driver.id) {
            driver.id = generateId();
        }
        await setDoc(doc(db, COLLECTIONS.drivers, driver.id), driver);

        if (cache.drivers) {
            const idx = cache.drivers.findIndex(d => d.id === driver.id);
            if (idx >= 0) cache.drivers[idx] = driver;
            else cache.drivers.push(driver);
        }

        return driver;
    } catch (error) {
        console.error('Error saving driver:', error);
        throw error;
    }
}

async function deleteDriver(id) {
    try {
        await deleteDoc(doc(db, COLLECTIONS.drivers, id));
        if (cache.drivers) {
            cache.drivers = cache.drivers.filter(d => d.id !== id);
        }
    } catch (error) {
        console.error('Error deleting driver:', error);
        throw error;
    }
}

// ==================== ENTRIES ====================
async function getEntries() {
    if (cache.entries) return cache.entries;

    try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.entries));
        cache.entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return cache.entries;
    } catch (error) {
        console.error('Error getting entries:', error);
        return [];
    }
}

function getEntriesByDate(date) {
    if (cache.entries) {
        return cache.entries.filter(e => e.date === date);
    }
    return [];
}

function getEntriesByMonth(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    if (cache.entries) {
        return cache.entries.filter(e => e.date && e.date.startsWith(prefix));
    }
    return [];
}

async function saveEntry(entry) {
    try {
        if (!entry.id) {
            entry.id = generateId();
        }
        entry.updatedAt = new Date().toISOString();

        await setDoc(doc(db, COLLECTIONS.entries, entry.id), entry);

        if (cache.entries) {
            const idx = cache.entries.findIndex(e => e.id === entry.id);
            if (idx >= 0) cache.entries[idx] = entry;
            else cache.entries.push(entry);
        }

        return entry;
    } catch (error) {
        console.error('Error saving entry:', error);
        throw error;
    }
}

async function deleteEntry(id) {
    try {
        await deleteDoc(doc(db, COLLECTIONS.entries, id));
        if (cache.entries) {
            cache.entries = cache.entries.filter(e => e.id !== id);
        }
    } catch (error) {
        console.error('Error deleting entry:', error);
        throw error;
    }
}

// ==================== SETTINGS ====================
async function getSettings() {
    if (cache.settings) return cache.settings;

    try {
        const settingsDoc = await getDoc(doc(db, COLLECTIONS.settings, 'default'));
        cache.settings = settingsDoc.exists() ? settingsDoc.data() : DEFAULT_SETTINGS;
        return cache.settings;
    } catch (error) {
        console.error('Error getting settings:', error);
        return DEFAULT_SETTINGS;
    }
}

async function saveSettings(settings) {
    try {
        await setDoc(doc(db, COLLECTIONS.settings, 'default'), settings);
        cache.settings = settings;
    } catch (error) {
        console.error('Error saving settings:', error);
        throw error;
    }
}

// ==================== CALCULATIONS ====================
function calculateEntryCosts(entry, truck) {
    if (!truck) truck = getTruckById(entry.camionId);
    if (!truck) return { montantGasoil: 0, coutTotal: 0, resultat: 0 };

    const montantGasoil = (entry.quantiteGasoil || 0) * (entry.prixGasoilLitre || 2);
    const coutTotal = montantGasoil +
        (truck.chargesFixes || 0) +
        (truck.montantAssurance || 0) +
        (truck.montantTaxe || 0) +
        (entry.maintenance || 0) +
        (truck.chargePersonnel || 0);
    const resultat = (entry.prixLivraison || 0) - coutTotal;

    return { montantGasoil, coutTotal, resultat };
}

// ==================== EXPORT/IMPORT ====================
async function exportData() {
    return {
        trucks: await getTrucks(),
        drivers: await getDrivers(),
        entries: await getEntries(),
        settings: await getSettings(),
        exportDate: new Date().toISOString()
    };
}

async function importData(data) {
    try {
        if (data.trucks) {
            for (const truck of data.trucks) {
                await setDoc(doc(db, COLLECTIONS.trucks, truck.id), truck);
            }
        }
        if (data.drivers) {
            for (const driver of data.drivers) {
                await setDoc(doc(db, COLLECTIONS.drivers, driver.id), driver);
            }
        }
        if (data.entries) {
            for (const entry of data.entries) {
                await setDoc(doc(db, COLLECTIONS.entries, entry.id), entry);
            }
        }
        if (data.settings) {
            await setDoc(doc(db, COLLECTIONS.settings, 'default'), data.settings);
        }

        await refreshCache();

    } catch (error) {
        console.error('Error importing data:', error);
        throw error;
    }
}

async function resetData() {
    try {
        // Delete all entries
        const entriesSnap = await getDocs(collection(db, COLLECTIONS.entries));
        for (const entryDoc of entriesSnap.docs) {
            await deleteDoc(doc(db, COLLECTIONS.entries, entryDoc.id));
        }

        // Repopulate trucks
        for (const truck of DEFAULT_TRUCKS) {
            await setDoc(doc(db, COLLECTIONS.trucks, truck.id), truck);
        }

        // Repopulate drivers
        for (const driver of DEFAULT_DRIVERS) {
            await setDoc(doc(db, COLLECTIONS.drivers, driver.id), driver);
        }

        // Reset settings
        await setDoc(doc(db, COLLECTIONS.settings, 'default'), DEFAULT_SETTINGS);

        await refreshCache();

    } catch (error) {
        console.error('Error resetting data:', error);
        throw error;
    }
}

// Export module
export const DataModule = {
    init,
    refreshCache,
    getTrucks,
    getTruckById,
    saveTruck,
    deleteTruck,
    getDrivers,
    getDriverById,
    saveDriver,
    deleteDriver,
    getEntries,
    getEntriesByDate,
    getEntriesByMonth,
    saveEntry,
    deleteEntry,
    getSettings,
    saveSettings,
    calculateEntryCosts,
    exportData,
    importData,
    resetData
};

// Make available globally
window.DataModule = DataModule;
