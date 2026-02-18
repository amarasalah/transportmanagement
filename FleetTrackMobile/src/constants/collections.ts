/**
 * Firestore Collection Names
 * Must match exactly the web app collections (firebase.js COLLECTIONS)
 */
export const COLLECTIONS = {
    // Auth
    users: 'users',
    roles: 'roles',

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
    demandesAchat: 'demandes_achat',
    bonCommandesAchat: 'bon_commandes_achat',
    bonLivraisonsAchat: 'bon_livraisons_achat',
    facturesAchat: 'factures_achat',
    reglementsFournisseurs: 'reglements_fournisseurs',
    bonsSortie: 'bons_sortie_achat',
    bonsRetour: 'bons_retour_achat',

    // Vente Client (Sales)
    offresPrix: 'offres_prix',
    bonCommandesVente: 'bon_commandes_vente',
    bonLivraisonsVente: 'bon_livraisons_vente',
    devisClients: 'devis_clients',
    facturesVente: 'factures_vente',

    // Planning
    planifications: 'planifications',

    // Caisse (Treasury)
    caisse: 'caisse_transactions',
} as const;
