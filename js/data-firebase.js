/**
 * DATA MODULE - FIREBASE FIRESTORE VERSION
 * Handles Firestore persistence and CRUD operations
 * With activity logging for all operations
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
    settings: null,
    logs: null
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

// ==================== ACTIVITY LOGGING ====================
async function logActivity(action, entityType, entityId, details = {}) {
    try {
        const logEntry = {
            id: generateId(),
            timestamp: new Date().toISOString(),
            action: action, // CREATE, UPDATE, DELETE, READ, EXPORT, IMPORT, RESET
            entityType: entityType, // truck, driver, entry, settings
            entityId: entityId,
            details: details,
            date: new Date().toISOString().split('T')[0]
        };

        await setDoc(doc(db, COLLECTIONS.logs, logEntry.id), logEntry);

        // Update cache
        if (cache.logs) {
            cache.logs.push(logEntry);
        }

        console.log(`📝 Log: ${action} ${entityType} ${entityId}`);
        return logEntry;
    } catch (error) {
        console.error('Error logging activity:', error);
        // Don't throw - logging should not block main operations
    }
}

async function getLogs() {
    if (cache.logs) return cache.logs;

    try {
        const snapshot = await getDocs(collection(db, COLLECTIONS.logs));
        cache.logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by timestamp descending
        cache.logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return cache.logs;
    } catch (error) {
        console.error('Error getting logs:', error);
        return [];
    }
}

async function getLogsByDate(date) {
    const logs = await getLogs();
    return logs.filter(l => l.date === date);
}

async function getLogsByEntity(entityType, entityId) {
    const logs = await getLogs();
    return logs.filter(l => l.entityType === entityType && l.entityId === entityId);
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
            await logActivity('INIT', 'trucks', 'all', { count: DEFAULT_TRUCKS.length });
        }

        // Check if drivers collection exists
        const driversSnapshot = await getDocs(collection(db, COLLECTIONS.drivers));
        if (driversSnapshot.empty) {
            console.log('👤 Populating drivers...');
            for (const driver of DEFAULT_DRIVERS) {
                await setDoc(doc(db, COLLECTIONS.drivers, driver.id), driver);
            }
            await logActivity('INIT', 'drivers', 'all', { count: DEFAULT_DRIVERS.length });
        }

        // Check settings
        const settingsDoc = await getDoc(doc(db, COLLECTIONS.settings, 'default'));
        if (!settingsDoc.exists()) {
            console.log('⚙️ Creating default settings...');
            await setDoc(doc(db, COLLECTIONS.settings, 'default'), DEFAULT_SETTINGS);
            await logActivity('INIT', 'settings', 'default', DEFAULT_SETTINGS);
        }

        console.log('✅ Firebase initialized successfully!');

        // Preload cache
        await refreshCache();

        // Auto-repair entries with old-format IDs
        await repairEntryIds();

    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
        console.log('⚠️ Falling back to localStorage...');
    }
}

// Refresh local cache from Firestore
async function refreshCache() {
    try {
        const [trucksSnap, driversSnap, entriesSnap, logsSnap] = await Promise.all([
            getDocs(collection(db, COLLECTIONS.trucks)),
            getDocs(collection(db, COLLECTIONS.drivers)),
            getDocs(collection(db, COLLECTIONS.entries)),
            getDocs(collection(db, COLLECTIONS.logs))
        ]);

        cache.trucks = trucksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        cache.drivers = driversSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        cache.entries = entriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        cache.logs = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        cache.logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        const settingsDoc = await getDoc(doc(db, COLLECTIONS.settings, 'default'));
        cache.settings = settingsDoc.exists() ? settingsDoc.data() : DEFAULT_SETTINGS;

    } catch (error) {
        console.error('Cache refresh error:', error);
    }
}

// Synchronous accessor for cached entries (for modules that need sync access)
function getCachedEntries() {
    return cache.entries || [];
}

function getCachedTrucks() {
    return cache.trucks || [];
}

function getCachedDrivers() {
    return cache.drivers || [];
}

// Lightweight refresh: trucks only (for GPS real-time updates)
async function refreshTrucksOnly() {
    try {
        const trucksSnap = await getDocs(collection(db, COLLECTIONS.trucks));
        cache.trucks = trucksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Trucks cache refresh error:', error);
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
    if (!cache.trucks) return null;
    // Direct ID match
    let truck = cache.trucks.find(t => t.id === id);
    if (truck) return truck;
    // Fallback: old import format 'truck_8565_TU_257' → match by matricule
    if (id && id.startsWith('truck_')) {
        const mat = id.replace('truck_', '').replace(/_/g, ' ');
        truck = cache.trucks.find(t => t.matricule === mat);
    }
    return truck || null;
}

async function saveTruck(truck) {
    try {
        const isNew = !truck.id;
        if (!truck.id) {
            truck.id = generateId();
        }
        truck.updatedAt = new Date().toISOString();

        await setDoc(doc(db, COLLECTIONS.trucks, truck.id), truck);
        await logActivity(isNew ? 'CREATE' : 'UPDATE', 'truck', truck.id, { matricule: truck.matricule, type: truck.type });

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
        const truck = getTruckById(id);
        await deleteDoc(doc(db, COLLECTIONS.trucks, id));
        await logActivity('DELETE', 'truck', id, { matricule: truck?.matricule });

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
    if (!cache.drivers) return null;
    // Direct ID match
    let driver = cache.drivers.find(d => d.id === id);
    if (driver) return driver;
    // Fallback: old import format 'driver_CHOKAIRI' → match by nom
    if (id && id.startsWith('driver_')) {
        const nom = id.replace('driver_', '').replace(/_/g, ' ');
        driver = cache.drivers.find(d => d.nom === nom);
    }
    return driver || null;
}

async function saveDriver(driver) {
    try {
        const isNew = !driver.id;
        if (!driver.id) {
            driver.id = generateId();
        }
        driver.updatedAt = new Date().toISOString();

        await setDoc(doc(db, COLLECTIONS.drivers, driver.id), driver);
        await logActivity(isNew ? 'CREATE' : 'UPDATE', 'driver', driver.id, { nom: driver.nom, camionId: driver.camionId });

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
        const driver = getDriverById(id);
        await deleteDoc(doc(db, COLLECTIONS.drivers, id));
        await logActivity('DELETE', 'driver', id, { nom: driver?.nom });

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
        const isNew = !entry.id;
        if (!entry.id) {
            entry.id = generateId();
        }
        entry.updatedAt = new Date().toISOString();
        if (!entry.createdAt) {
            entry.createdAt = entry.updatedAt;
        }

        await setDoc(doc(db, COLLECTIONS.entries, entry.id), entry);

        // Log with detailed entry info
        await logActivity(isNew ? 'CREATE' : 'UPDATE', 'entry', entry.id, {
            date: entry.date,
            camionId: entry.camionId,
            chauffeurId: entry.chauffeurId,
            origine: entry.origine,
            destination: entry.destination,
            kilometrage: entry.kilometrage,
            distanceAller: entry.distanceAller,
            distanceRetour: entry.distanceRetour,
            quantiteGasoil: entry.quantiteGasoil,
            prixGasoilLitre: entry.prixGasoilLitre,
            maintenance: entry.maintenance,
            prixLivraison: entry.prixLivraison,
            remarques: entry.remarques
        });

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
        const entry = cache.entries?.find(e => e.id === id);
        await deleteDoc(doc(db, COLLECTIONS.entries, id));
        await logActivity('DELETE', 'entry', id, {
            date: entry?.date,
            destination: entry?.destination,
            origine: entry?.origine
        });

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
        await logActivity('UPDATE', 'settings', 'default', settings);
        cache.settings = settings;
    } catch (error) {
        console.error('Error saving settings:', error);
        throw error;
    }
}

// ==================== AUTO-REPAIR & DEDUPLICATE ENTRIES ====================
async function repairEntryIds() {
    if (!cache.entries || !cache.trucks || !cache.drivers) return;
    let repaired = 0;
    let deleted = 0;

    // Phase 1: Fix old-format camionId/chauffeurId
    for (const entry of cache.entries) {
        let needsUpdate = false;
        const updated = { ...entry };

        // Fix camionId: truck_8565_TU_257 → t1
        if (entry.camionId && entry.camionId.startsWith('truck_')) {
            const mat = entry.camionId.replace('truck_', '').replace(/_/g, ' ');
            const truck = cache.trucks.find(t => t.matricule === mat);
            if (truck && truck.id !== entry.camionId) {
                updated.camionId = truck.id;
                updated.matricule = updated.matricule || mat;
                needsUpdate = true;
            }
        }

        // Fix chauffeurId: driver_CHOKAIRI → d1
        if (entry.chauffeurId && entry.chauffeurId.startsWith('driver_')) {
            const nom = entry.chauffeurId.replace('driver_', '').replace(/_/g, ' ');
            const driver = cache.drivers.find(d => d.nom === nom);
            if (driver && driver.id !== entry.chauffeurId) {
                updated.chauffeurId = driver.id;
                updated.chauffeur = updated.chauffeur || nom;
                needsUpdate = true;
            }
        }

        // Ensure matricule/chauffeur fields are populated
        if (!updated.matricule && updated.camionId) {
            const truck = cache.trucks.find(t => t.id === updated.camionId);
            if (truck) { updated.matricule = truck.matricule; needsUpdate = true; }
        }
        if (!updated.chauffeur && updated.chauffeurId) {
            const driver = cache.drivers.find(d => d.id === updated.chauffeurId);
            if (driver) { updated.chauffeur = driver.nom; needsUpdate = true; }
        }

        if (needsUpdate) {
            try {
                await setDoc(doc(db, COLLECTIONS.entries, entry.id), updated);
                Object.assign(entry, updated);
                repaired++;
            } catch (err) {
                console.error('Repair failed for entry', entry.id, err);
            }
        }
    }

    // Phase 2: Deduplicate (remove old-format entries if new-format exists for same date+truck)
    const seen = new Map(); // key: date_camionId → best entry
    const toDelete = [];

    for (const entry of cache.entries) {
        const key = `${entry.date}_${entry.camionId}`;
        if (seen.has(key)) {
            // Keep the newer/better entry (prefer entry_date_tX format)
            const existing = seen.get(key);
            const existingIsNew = existing.id.match(/^entry_\d{4}-\d{2}-\d{2}_t\d+$/);
            const currentIsNew = entry.id.match(/^entry_\d{4}-\d{2}-\d{2}_t\d+$/);
            if (currentIsNew && !existingIsNew) {
                toDelete.push(existing.id);
                seen.set(key, entry);
            } else {
                toDelete.push(entry.id);
            }
        } else {
            seen.set(key, entry);
        }
    }

    for (const id of toDelete) {
        try {
            await deleteDoc(doc(db, COLLECTIONS.entries, id));
            deleted++;
        } catch (err) {
            console.error('Dedup delete failed for', id, err);
        }
    }

    if (deleted > 0) {
        cache.entries = cache.entries.filter(e => !toDelete.includes(e.id));
        console.log(`🧹 Removed ${deleted} duplicate entries`);
    }
    if (repaired > 0) {
        console.log(`🔧 Auto-repaired ${repaired} entries (old-format IDs → standard IDs)`);
    }
}

// ==================== CALCULATIONS ====================
function calculateEntryCosts(entry, truck, isFirstTripOfDay = true) {
    if (!truck) truck = getTruckById(entry.camionId);

    // Gasoil and maintenance are ALWAYS per-trip
    const montantGasoil = entry.montantGasoil || ((entry.quantiteGasoil || 0) * (entry.prixGasoilLitre || 2));
    const maintenance = entry.maintenance || 0;

    // Fixed charges apply ONLY for the first trip of the day per truck
    let chargesFixes = 0, montantAssurance = 0, montantTaxe = 0, chargePersonnel = 0, fraisLeasing = 0;
    if (isFirstTripOfDay) {
        chargesFixes = entry.chargesFixes != null ? entry.chargesFixes : (truck?.chargesFixes || 0);
        montantAssurance = entry.montantAssurance != null ? entry.montantAssurance : (truck?.montantAssurance || 0);
        montantTaxe = entry.montantTaxe != null ? entry.montantTaxe : (truck?.montantTaxe || 0);
        chargePersonnel = entry.chargePersonnel != null ? entry.chargePersonnel : (truck?.chargePersonnel || 0);
        fraisLeasing = entry.fraisLeasing != null ? entry.fraisLeasing : (truck?.fraisLeasing || 0);
    }

    const coutTotal = montantGasoil + chargesFixes + montantAssurance + montantTaxe + maintenance + chargePersonnel + fraisLeasing;
    const resultat = (entry.prixLivraison || 0) - coutTotal;

    return { montantGasoil, coutTotal, resultat };
}

// ==================== EXPORT/IMPORT ====================
async function exportData() {
    await logActivity('EXPORT', 'all', 'backup', { timestamp: new Date().toISOString() });

    return {
        trucks: await getTrucks(),
        drivers: await getDrivers(),
        entries: await getEntries(),
        settings: await getSettings(),
        logs: await getLogs(),
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

        await logActivity('IMPORT', 'all', 'restore', {
            trucksCount: data.trucks?.length || 0,
            driversCount: data.drivers?.length || 0,
            entriesCount: data.entries?.length || 0
        });

        await refreshCache();

    } catch (error) {
        console.error('Error importing data:', error);
        throw error;
    }
}

async function resetData() {
    try {
        // Log before reset
        await logActivity('RESET', 'all', 'reset', { timestamp: new Date().toISOString() });

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
    // Trucks
    getTrucks,
    getTruckById,
    saveTruck,
    deleteTruck,
    // Drivers
    getDrivers,
    getDriverById,
    saveDriver,
    deleteDriver,
    // Entries
    getEntries,
    getEntriesByDate,
    getEntriesByMonth,
    saveEntry,
    deleteEntry,
    // Settings
    getSettings,
    saveSettings,
    // Calculations
    calculateEntryCosts,
    // Export/Import
    exportData,
    importData,
    resetData,
    // Logs
    getLogs,
    getLogsByDate,
    getLogsByEntity,
    logActivity,
    // Cached accessors (sync)
    getCachedEntries,
    getCachedTrucks,
    getCachedDrivers,
    refreshTrucksOnly
};

// Make available globally
window.DataModule = DataModule;
