/**
 * Entries Service - Firebase CRUD
 */
import { db, collection, doc, getDocs, setDoc, deleteDoc } from './firebase';
import { COLLECTIONS } from '../constants/collections';
import { Entry } from '../types';

let cache: Entry[] | null = null;

export async function getEntries(): Promise<Entry[]> {
    if (cache) return cache;
    const snap = await getDocs(collection(db, COLLECTIONS.entries));
    cache = snap.docs.map(d => ({ id: d.id, ...d.data() } as Entry));
    return cache;
}

export function getEntriesByDate(date: string): Entry[] {
    return (cache || []).filter(e => e.date === date);
}

export function getCachedEntries(): Entry[] {
    return cache || [];
}

export async function saveEntry(entry: Entry): Promise<Entry> {
    const isNew = !entry.id;
    if (!entry.id) {
        entry.id = 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
    entry.updatedAt = new Date().toISOString();
    if (!entry.createdAt) entry.createdAt = entry.updatedAt;

    await setDoc(doc(db, COLLECTIONS.entries, entry.id), entry as any);

    if (cache) {
        const idx = cache.findIndex(e => e.id === entry.id);
        if (idx >= 0) cache[idx] = entry;
        else cache.push(entry);
    }
    return entry;
}

export async function deleteEntry(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.entries, id));
    if (cache) cache = cache.filter(e => e.id !== id);
}

export function clearCache() {
    cache = null;
}
