/**
 * Excel to Firebase Data Extractor - Fixed Version
 * Parses Tableau_suivi_journalier_camion.xlsx and outputs clean JSON
 */

const XLSX = require('xlsx');
const fs = require('fs');

const workbook = XLSX.readFile('Tableau_suivi_journalier_camion.xlsx');

console.log('📊 Extraction des données depuis Excel...\n');

// Data structures
const trucksMap = new Map();
const driversMap = new Map();
const entries = [];
let entryId = 1;

// Helper to convert Excel date serial to YYYY-MM-DD
function parseSheetDate(sheetName) {
    const match = sheetName.trim().match(/^(\d{2})-(\d{2})-(\d{2})/);
    if (match) {
        return `20${match[3]}-${match[2]}-${match[1]}`;
    }
    return null;
}

// First pass: collect all trucks and drivers from first sheet to get accurate mapping
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const firstData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

let headerRow = -1;
for (let i = 0; i < 20; i++) {
    if (firstData[i] && firstData[i].join(' ').includes('Matricule')) {
        headerRow = i;
        break;
    }
}

// Build truck and driver maps from first sheet
for (let i = headerRow + 1; i < firstData.length; i++) {
    const row = firstData[i];
    if (!row || !row[1]) continue;

    const matricule = String(row[1] || '').trim();
    if (!matricule || !/\d+\s*TU\s*\d+/i.test(matricule)) continue;

    const chauffeur = String(row[2] || '').trim();
    const type = String(row[3] || 'PLATEAU').trim();
    const chargesFixes = parseFloat(row[10]) || 80;
    const assurance = parseFloat(row[11]) || 20;
    const taxe = parseFloat(row[12]) || 20;
    const personnel = parseFloat(row[14]) || 80;

    // Create truck
    if (!trucksMap.has(matricule)) {
        const truckId = 't' + (trucksMap.size + 1);
        trucksMap.set(matricule, {
            id: truckId,
            matricule: matricule,
            type: type,
            chargesFixes: chargesFixes,
            montantAssurance: assurance,
            montantTaxe: taxe,
            chargePersonnel: personnel
        });
    }

    // Create driver
    if (chauffeur && !driversMap.has(chauffeur)) {
        const driverId = 'd' + (driversMap.size + 1);
        driversMap.set(chauffeur, {
            id: driverId,
            nom: chauffeur,
            camionId: trucksMap.get(matricule).id
        });
    }
}

console.log(`Found ${trucksMap.size} trucks and ${driversMap.size} drivers in first sheet`);

// Second pass: Process all sheets for entries
workbook.SheetNames.forEach(sheetName => {
    const date = parseSheetDate(sheetName);
    if (!date) {
        console.log(`⏭️ Ignoring sheet: ${sheetName}`);
        return;
    }

    console.log(`📅 Processing: ${sheetName} -> ${date}`);

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Find header row
    let hRow = -1;
    for (let i = 0; i < 20; i++) {
        if (data[i] && data[i].join(' ').includes('Matricule')) {
            hRow = i;
            break;
        }
    }
    if (hRow === -1) return;

    // Process data rows
    for (let i = hRow + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[1]) continue;

        const matricule = String(row[1] || '').trim();
        if (!matricule || !/\d+\s*TU\s*\d+/i.test(matricule)) continue;

        const chauffeur = String(row[2] || '').trim();
        const km = parseFloat(row[5]) || 0;
        const gasoil = parseFloat(row[7]) || 0;
        const prixGasoil = parseFloat(row[8]) || 2;
        const maintenance = parseFloat(row[13]) || 0;
        const prixLivraison = parseFloat(row[16]) || 0;
        const destination = String(row[4] || '').trim();
        const remarques = String(row[18] || '').trim();

        // Skip entries without any activity
        if (km === 0 && gasoil === 0 && prixLivraison === 0) continue;

        // Get truck ID
        const truck = trucksMap.get(matricule);
        if (!truck) continue;

        // Get driver ID (just the ID string, not the object!)
        let driverId = null;
        if (chauffeur && driversMap.has(chauffeur)) {
            driverId = driversMap.get(chauffeur).id;  // Get just the ID
        }

        entries.push({
            id: 'e' + entryId++,
            date: date,
            camionId: truck.id,
            chauffeurId: driverId,
            destination: destination,
            kilometrage: km,
            quantiteGasoil: gasoil,
            prixGasoilLitre: prixGasoil,
            maintenance: maintenance,
            prixLivraison: prixLivraison,
            remarques: remarques
        });
    }
});

// Convert to arrays
const trucks = Array.from(trucksMap.values());
const drivers = Array.from(driversMap.values());

console.log('\n========================================');
console.log('📊 RÉSULTATS:');
console.log(`   📦 ${trucks.length} camions`);
console.log(`   👤 ${drivers.length} chauffeurs`);
console.log(`   📝 ${entries.length} saisies`);
console.log('========================================\n');

// Save clean JSON
const outputData = {
    trucks: trucks,
    drivers: drivers,
    entries: entries,
    settings: { defaultFuelPrice: 2, currency: 'TND' }
};

fs.writeFileSync('excel_data_clean.json', JSON.stringify(outputData, null, 2));
console.log('✅ Données propres sauvegardées dans excel_data_clean.json');

// Verify chauffeurId is always a string or null
const badEntries = entries.filter(e => e.chauffeurId && typeof e.chauffeurId !== 'string');
if (badEntries.length > 0) {
    console.log(`⚠️ ${badEntries.length} entries with bad chauffeurId`);
} else {
    console.log('✅ All chauffeurId values are correct (string or null)');
}

// Print sample
console.log('\n📝 Quelques saisies:');
entries.slice(0, 5).forEach(e => {
    console.log(`   ${e.date} | ${e.destination} | ${e.kilometrage}km | chauffeurId: ${e.chauffeurId}`);
});
