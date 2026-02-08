/**
 * Complete Excel Data Extractor - All Sheets
 * Parses ALL sheets from Tableau_suivi_journalier_camion.xlsx
 */

const XLSX = require('xlsx');
const fs = require('fs');

const workbook = XLSX.readFile('Tableau_suivi_journalier_camion.xlsx');

console.log('📊 Scanning Excel file: Tableau_suivi_journalier_camion.xlsx\n');
console.log('📋 Found sheets:', workbook.SheetNames.join(', '));
console.log('');

// Data structures
const trucksMap = new Map();
const driversMap = new Map();
const entries = [];
let entryId = 1;

// Parse date from sheet name (DD-MM-YY)
function parseSheetDate(sheetName) {
    const match = sheetName.trim().match(/^(\d{2})-(\d{2})-(\d{2})/);
    if (match) {
        return `20${match[3]}-${match[2]}-${match[1]}`;
    }
    return null;
}

// First pass: Build truck and driver maps from all sheets
console.log('🔍 Pass 1: Collecting trucks and drivers...');

workbook.SheetNames.forEach(sheetName => {
    const date = parseSheetDate(sheetName);
    if (!date) return;

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Find header row
    let headerRow = -1;
    for (let i = 0; i < 20; i++) {
        if (data[i] && data[i].join(' ').includes('Matricule')) {
            headerRow = i;
            break;
        }
    }
    if (headerRow === -1) return;

    // Extract trucks and drivers
    for (let i = headerRow + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[1]) continue;

        const matricule = String(row[1] || '').trim();
        if (!matricule || !/\d+\s*TU\s*\d+/i.test(matricule)) continue;

        const chauffeur = String(row[2] || '').trim();
        const type = String(row[3] || 'PLATEAU').trim().toUpperCase();
        const chargesFixes = parseFloat(row[10]) || 80;
        const assurance = parseFloat(row[11]) || 20;
        const taxe = parseFloat(row[12]) || 20;
        const personnel = parseFloat(row[14]) || 80;

        // Create/update truck
        if (!trucksMap.has(matricule)) {
            const truckId = 't' + (trucksMap.size + 1);
            trucksMap.set(matricule, {
                id: truckId,
                matricule: matricule,
                type: type || 'PLATEAU',
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
});

console.log(`   Found ${trucksMap.size} unique trucks`);
console.log(`   Found ${driversMap.size} unique drivers\n`);

// Second pass: Extract all entries
console.log('📝 Pass 2: Extracting entries from all sheets...');

workbook.SheetNames.forEach(sheetName => {
    const date = parseSheetDate(sheetName);
    if (!date) {
        console.log(`   ⏭️ Skipping: ${sheetName} (not a daily sheet)`);
        return;
    }

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Find header
    let hRow = -1;
    for (let i = 0; i < 20; i++) {
        if (data[i] && data[i].join(' ').includes('Matricule')) {
            hRow = i;
            break;
        }
    }
    if (hRow === -1) return;

    let sheetEntries = 0;

    // Process rows
    for (let i = hRow + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[1]) continue;

        const matricule = String(row[1] || '').trim();
        if (!matricule || !/\d+\s*TU\s*\d+/i.test(matricule)) continue;

        const truck = trucksMap.get(matricule);
        if (!truck) continue;

        const chauffeur = String(row[2] || '').trim();
        const destination = String(row[4] || '').trim();
        const km = parseFloat(row[5]) || 0;
        const gasoil = parseFloat(row[7]) || 0;
        const prixGasoil = parseFloat(row[8]) || 2;
        const maintenance = parseFloat(row[13]) || 0;
        const prixLivraison = parseFloat(row[16]) || 0;
        const remarques = String(row[18] || '').trim();

        // Skip empty entries
        if (km === 0 && gasoil === 0 && prixLivraison === 0) continue;

        // Get driver ID
        let driverId = null;
        if (chauffeur && driversMap.has(chauffeur)) {
            driverId = driversMap.get(chauffeur).id;
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
        sheetEntries++;
    }

    console.log(`   📅 ${sheetName} (${date}): ${sheetEntries} entries`);
});

// Convert to arrays
const trucks = Array.from(trucksMap.values());
const drivers = Array.from(driversMap.values());

// Get unique dates
const uniqueDates = [...new Set(entries.map(e => e.date))].sort();

console.log('\n========================================');
console.log('📊 EXTRACTION COMPLETE:');
console.log('========================================');
console.log(`   📦 ${trucks.length} trucks`);
console.log(`   👤 ${drivers.length} drivers`);
console.log(`   📝 ${entries.length} entries`);
console.log(`   📅 ${uniqueDates.length} days: ${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}`);
console.log('========================================\n');

// Save complete data
const completeData = {
    trucks: trucks,
    drivers: drivers,
    entries: entries,
    settings: { defaultFuelPrice: 2, currency: 'TND' }
};

fs.writeFileSync('complete_excel_data.json', JSON.stringify(completeData, null, 2));
console.log('✅ Complete data saved to: complete_excel_data.json');

// Print summaries
console.log('\n🚚 TRUCKS:');
trucks.forEach(t => console.log(`   ${t.id}: ${t.matricule} (${t.type})`));

console.log('\n👤 DRIVERS:');
drivers.forEach(d => console.log(`   ${d.id}: ${d.nom}`));

console.log('\n📅 ENTRIES BY DATE:');
uniqueDates.forEach(date => {
    const count = entries.filter(e => e.date === date).length;
    console.log(`   ${date}: ${count} entries`);
});
