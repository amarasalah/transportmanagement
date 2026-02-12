/**
 * Drivers Service - Firebase CRUD
 */
import { db, collection, doc, getDocs, setDoc, deleteDoc } from './firebase';
import { COLLECTIONS } from '../constants/collections';
import { Driver } from '../types';

let cache: Driver[] | null = null;

export async function getDrivers(): Promise<Driver[]> {
    if (cache) return cache;
    const snap = await getDocs(collection(db, COLLECTIONS.drivers));
    cache = snap.docs.map(d => ({ id: d.id, ...d.data() } as Driver));
    return cache;
}

export function getDriverById(id: string): Driver | undefined {
    return cache?.find(d => d.id === id);
}

export function getCachedDrivers(): Driver[] {
    return cache || [];
}

export async function saveDriver(driver: Driver): Promise<void> {
    if (!driver.id) {
        driver.id = 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
    await setDoc(doc(db, COLLECTIONS.drivers, driver.id), driver);
    if (cache) {
        const idx = cache.findIndex(d => d.id === driver.id);
        if (idx >= 0) cache[idx] = driver;
        else cache.push(driver);
    }
}

export async function deleteDriver(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.drivers, id));
    if (cache) cache = cache.filter(d => d.id !== id);
}

export function clearCache() {
    cache = null;
}
