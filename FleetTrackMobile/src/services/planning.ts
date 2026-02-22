/**
 * Planning Service - Firebase CRUD
 */
import { db, collection, doc, getDocs, setDoc, deleteDoc } from './firebase';
import { COLLECTIONS } from '../constants/collections';
import { Planification, TripPhotos } from '../types';

let cache: Planification[] | null = null;

export async function getPlanifications(): Promise<Planification[]> {
    if (cache) return cache;
    const snap = await getDocs(collection(db, COLLECTIONS.planifications));
    cache = snap.docs.map(d => ({ id: d.id, ...d.data() } as Planification));
    cache.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return cache;
}

export function getPlanificationsByDate(date: string): Planification[] {
    return (cache || []).filter(p => p.date === date);
}

export function getPlanificationsByStatus(statut: string): Planification[] {
    return (cache || []).filter(p => p.statut === statut);
}

export async function savePlanification(plan: Planification): Promise<void> {
    if (!plan.id) {
        plan.id = 'plan_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
    plan.updatedAt = new Date().toISOString();
    await setDoc(doc(db, COLLECTIONS.planifications, plan.id), plan as any);
    if (cache) {
        const idx = cache.findIndex(p => p.id === plan.id);
        if (idx >= 0) cache[idx] = plan;
        else cache.push(plan);
        cache.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
}

export async function deletePlanification(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.planifications, id));
    if (cache) cache = cache.filter(p => p.id !== id);
}

export async function updateStatus(id: string, statut: Planification['statut']): Promise<void> {
    const plan = cache?.find(p => p.id === id);
    if (plan) {
        plan.statut = statut;
        plan.updatedAt = new Date().toISOString();
        await setDoc(doc(db, COLLECTIONS.planifications, plan.id), plan as any);
    }
}

/**
 * Update plan status WITH confirmation photos
 * Called when driver confirms trip begin (planifié → en_cours) or end (en_cours → attente_confirmation)
 */
export async function updateStatusWithPhotos(
    id: string,
    statut: Planification['statut'],
    photos: TripPhotos
): Promise<void> {
    const plan = cache?.find(p => p.id === id);
    if (!plan) throw new Error('Plan not found: ' + id);

    plan.statut = statut;
    plan.updatedAt = new Date().toISOString();

    if (statut === 'en_cours') {
        plan.startPhotos = photos;
    } else if (statut === 'attente_confirmation' || statut === 'termine') {
        plan.endPhotos = photos;
    }

    await setDoc(doc(db, COLLECTIONS.planifications, plan.id), plan as any);
}

export function clearCache() { cache = null; }
