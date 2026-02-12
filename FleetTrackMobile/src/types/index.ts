/**
 * FleetTrack Mobile - TypeScript Types
 * Matching the web app Firebase data models exactly
 */

export interface Truck {
    id: string;
    matricule: string;
    type: 'PLATEAU' | 'BENNE' | 'CITERNE';
    marque?: string;
    chargesFixes: number;
    montantAssurance: number;
    montantTaxe: number;
    chargePersonnel: number;
    updatedAt?: string;
}

export interface Driver {
    id: string;
    nom: string;
    telephone?: string;
    camionId?: string;
    createdAt?: string;
}

export interface Entry {
    id: string;
    date: string;
    camionId: string;
    chauffeurId: string;
    clientId?: string;
    // Origin
    origineGouvernorat?: string;
    origineDelegation?: string;
    origine?: string;
    // Destination
    gouvernorat?: string;
    delegation?: string;
    destination?: string;
    // Distances
    kilometrage: number;
    distanceAller?: number;
    distanceRetour?: number;
    kmGlobal?: number;
    // Fuel
    quantiteGasoil: number;
    prixGasoilLitre: number;
    montantGasoil?: number;
    // Costs
    maintenance: number;
    chargesFixes?: number;
    // Revenue
    prixLivraison: number;
    remarques?: string;
    // Meta
    createdAt?: string;
    updatedAt?: string;
    source?: string;
}

export interface EntryCosts {
    montantGasoil: number;
    coutTotal: number;
    resultat: number;
}

export interface Planification extends Omit<Entry, 'id'> {
    id: string;
    statut: 'planifie' | 'en_cours' | 'termine' | 'annule';
    estimatedDistance?: number;
}

export interface Client {
    id: string;
    code: string;
    nom: string;
    telephone?: string;
    email?: string;
    adresse?: string;
    rib?: string;
    solde: number;
    updatedAt?: string;
}

export interface Supplier {
    id: string;
    code: string;
    nom: string;
    telephone?: string;
    email?: string;
    adresse?: string;
    rib?: string;
    solde: number;
    updatedAt?: string;
}

export interface OrderLine {
    articleId: string;
    designation: string;
    quantite: number;
    prixUnitaire: number;
    tva: number;
    totalHT: number;
    totalTTC: number;
}

export interface PurchaseOrder {
    id: string;
    numero: string;
    date: string;
    camionId?: string;
    fournisseurId: string;
    statut: 'Brouillon' | 'En cours' | 'Validé';
    lignes: OrderLine[];
    totalHT: number;
    totalTVA: number;
    totalTTC: number;
    updatedAt?: string;
}

export interface Settings {
    id: string;
    defaultFuelPrice: number;
    currency: string;
}

export interface TruckStats {
    totalKm: number;
    totalGasoil: number;
    totalCout: number;
    totalRevenue: number;
    resultat: number;
    coutParKm: number;
    consommation: number;
    nbTrajets: number;
    performance: number;
}

export interface DashboardKPIs {
    activeTrucks: number;
    totalKm: number;
    totalGasoil: number;
    totalResult: number;
    totalRevenue: number;
    totalCost: number;
}
