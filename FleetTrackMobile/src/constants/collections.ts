/**
 * Firestore Collection Names
 * Must match exactly the web app collections
 */
export const COLLECTIONS = {
    // FleetTrack Core
    trucks: 'trucks',
    drivers: 'drivers',
    entries: 'entries',
    settings: 'settings',
    logs: 'activity_logs',

    // ERP Core
    suppliers: 'suppliers',
    clients: 'clients',
    articles: 'articles',
    depots: 'depots',

    // Achat Local (Purchasing)
    bonCommandesAchat: 'bon_commandes_achat',
    bonLivraisonsAchat: 'bon_livraisons_achat',
    facturesAchat: 'factures_achat',

    // Vente Client (Sales)
    bonCommandesVente: 'bon_commandes_vente',
    bonLivraisonsVente: 'bon_livraisons_vente',
    facturesVente: 'factures_vente',

    // Planning
    planifications: 'planifications',
} as const;
