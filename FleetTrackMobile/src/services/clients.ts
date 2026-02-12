/**
 * Clients Service - Firebase CRUD
 */
import { db, collection, doc, getDocs, setDoc, deleteDoc } from './firebase';
import { COLLECTIONS } from '../constants/collections';
import { Client } from '../types';

let cache: Client[] = [];

export async function loadClients(): Promise<Client[]> {
    const snap = await getDocs(collection(db, COLLECTIONS.clients));
    cache = snap.docs.map(d => ({ id: d.id, ...d.data() } as Client));
    return cache;
}

export async function getClients(): Promise<Client[]> {
    if (cache.length === 0) await loadClients();
    return cache;
}

export function getClientById(id: string): Client | undefined {
    return cache.find(c => c.id === id);
}

export async function saveClient(client: Client): Promise<void> {
    if (!client.id) client.id = `client_${Date.now()}`;
    client.updatedAt = new Date().toISOString();
    await setDoc(doc(db, COLLECTIONS.clients, client.id), client);
    const idx = cache.findIndex(c => c.id === client.id);
    if (idx >= 0) cache[idx] = client;
    else cache.push(client);
}

export async function deleteClient(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.clients, id));
    cache = cache.filter(c => c.id !== id);
}

export function clearCache() { cache = []; }
