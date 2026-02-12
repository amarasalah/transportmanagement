/**
 * Trucks Service - Firebase CRUD
 */
import { db, collection, doc, getDocs, setDoc, deleteDoc } from './firebase';
import { COLLECTIONS } from '../constants/collections';
import { Truck, TruckStats, Entry, EntryCosts } from '../types';

let cache: Truck[] | null = null;

export async function getTrucks(): Promise<Truck[]> {
    if (cache) return cache;
    const snap = await getDocs(collection(db, COLLECTIONS.trucks));
    cache = snap.docs.map(d => ({ id: d.id, ...d.data() } as Truck));
    return cache;
}

export function getTruckById(id: string): Truck | undefined {
    return cache?.find(t => t.id === id);
}

export function getCachedTrucks(): Truck[] {
    return cache || [];
}

export async function saveTruck(truck: Truck): Promise<void> {
    if (!truck.id) {
        truck.id = 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
    truck.updatedAt = new Date().toISOString();
    await setDoc(doc(db, COLLECTIONS.trucks, truck.id), truck);
    // Update cache
    if (cache) {
        const idx = cache.findIndex(t => t.id === truck.id);
        if (idx >= 0) cache[idx] = truck;
        else cache.push(truck);
    }
}

export async function deleteTruck(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.trucks, id));
    if (cache) cache = cache.filter(t => t.id !== id);
}

export function calculateTruckStats(truckId: string, entries: Entry[]): TruckStats {
    const truckEntries = entries.filter(e => e.camionId === truckId);
    const truck = getTruckById(truckId);

    if (truckEntries.length === 0) {
        return { totalKm: 0, totalGasoil: 0, totalCout: 0, totalRevenue: 0, resultat: 0, coutParKm: 0, consommation: 0, nbTrajets: 0, performance: 0 };
    }

    let totalKm = 0, totalGasoil = 0, totalCout = 0, totalRevenue = 0;

    truckEntries.forEach(entry => {
        totalKm += entry.kilometrage || 0;
        totalGasoil += entry.quantiteGasoil || 0;
        totalRevenue += entry.prixLivraison || 0;
        const costs = calculateEntryCosts(entry, truck);
        totalCout += costs.coutTotal;
    });

    const resultat = totalRevenue - totalCout;
    const coutParKm = totalKm > 0 ? totalCout / totalKm : 0;
    const consommation = totalKm > 0 ? (totalGasoil / totalKm) * 100 : 0;
    const performance = totalRevenue > 0 ? (resultat / totalRevenue) * 100 : 0;

    return { totalKm, totalGasoil, totalCout, totalRevenue, resultat, coutParKm, consommation, nbTrajets: truckEntries.length, performance };
}

export function calculateEntryCosts(entry: Entry, truck?: Truck): EntryCosts {
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

export function clearCache() {
    cache = null;
}
