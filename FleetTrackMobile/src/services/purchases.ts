/**
 * Purchases Service - Firebase CRUD for Bons de Commande Achat
 */
import { db, collection, doc, getDocs, setDoc, deleteDoc } from './firebase';
import { COLLECTIONS } from '../constants/collections';
import { PurchaseOrder } from '../types';

let cache: PurchaseOrder[] | null = null;

export async function getOrders(): Promise<PurchaseOrder[]> {
    if (cache) return cache;
    const snap = await getDocs(collection(db, COLLECTIONS.bonCommandesAchat));
    cache = snap.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder));
    return cache;
}

export function getOrderById(id: string): PurchaseOrder | undefined {
    return cache?.find(o => o.id === id);
}

export async function saveOrder(order: PurchaseOrder): Promise<void> {
    if (!order.id) {
        order.id = 'bc_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
    order.updatedAt = new Date().toISOString();
    await setDoc(doc(db, COLLECTIONS.bonCommandesAchat, order.id), order as any);
    if (cache) {
        const idx = cache.findIndex(o => o.id === order.id);
        if (idx >= 0) cache[idx] = order;
        else cache.push(order);
    }
}

export async function deleteOrder(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.bonCommandesAchat, id));
    if (cache) cache = cache.filter(o => o.id !== id);
}

export function clearCache() { cache = null; }
