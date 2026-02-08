/**
 * Excel to Firebase Data Extractor
 * Parses Tableau_suivi_journalier_camion.xlsx and outputs JSON for data-firebase.js
 */

const XLSX = require('xlsx');
const fs = require('fs');

// Read Excel file
const workbook = XLSX.readFile('Tableau_suivi_journalier_camion.xlsx');

console.log('📊 Extraction des données depuis Excel...\n');

// Data structures
const trucks = new Map();
const drivers = new Map();
const entries = [];
let entryId = 1;

// Helper to convert Excel date serial to YYYY-MM-DD
function parseSheetDate(sheetName) {
    // Format: DD-MM-YY (e.g., "02-02-26" means 02-Feb-2026)
    const match = sheetName.trim().match(/^(\d{2})-(\d{2})-(\d{2})/);
    if (match) {
        const day = match[1];
        const month = match[2];
        const year = '20' + match[3];
        return `${year}-${month}-${day}`;
    }
    return null;
}

// Process each daily sheet
workbook.SheetNames.forEach(sheetName => {
    const date = parseSheetDate(sheetName);
    if (!date) {
        console.log(`⏭️ Ignoring sheet: ${sheetName}`);
        return;
    }

    console.log(`📅 Processing: ${sheetName} -> ${date}`);

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Find header row (contains "Matricule camion")
    let headerRow = -1;
    for (let i = 0; i < 20; i++) {
        if (data[i] && data[i].join(' ').includes('Matricule')) {
            headerRow = i;
            break;
        }
    }

    if (headerRow === -1) {
        console.log(`   ⚠️ No header found`);
        return;
    }

    // Process data rows (after header)
    for (let i = headerRow + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[1]) continue; // Skip empty rows

        const matricule = String(row[1] || '').trim();
        if (!matricule || !/\d+\s*TU\s*\d+/i.test(matricule)) continue;

        const chauffeur = String(row[2] || '').trim();
        const type = String(row[3] || 'PLATEAU').trim();
        const destination = String(row[4] || '').trim();
        const km = parseFloat(row[5]) || 0;
        const gasoil = parseFloat(row[7]) || 0;
        const prixGasoil = parseFloat(row[8]) || 2;
        const chargesFixes = parseFloat(row[10]) || 80;
        const assurance = parseFloat(row[11]) || 20;
        const taxe = parseFloat(row[12]) || 20;
        const maintenance = parseFloat(row[13]) || 0;
        const personnel = parseFloat(row[14]) || 80;
        const prixLivraison = parseFloat(row[16]) || 0;
        const remarques = String(row[18] || '').trim();

        // Create truck ID
        let truckId = trucks.get(matricule);
        if (!truckId) {
            truckId = 't' + (trucks.size + 1);
            trucks.set(matricule, {
                id: truckId,
                matricule: matricule,
                type: type,
                chargesFixes: chargesFixes,
                montantAssurance: assurance,
                montantTaxe: taxe,
                chargePersonnel: personnel
            });
        }

        // Create driver ID
        let driverId = null;
        if (chauffeur) {
            driverId = drivers.get(chauffeur);
            if (!driverId) {
                driverId = 'd' + (drivers.size + 1);
                drivers.set(chauffeur, {
                    id: driverId,
                    nom: chauffeur,
                    camionId: truckId
                });
            }
        }

        // Skip entries without activity
        if (km === 0 && gasoil === 0 && prixLivraison === 0) continue;

        // Create entry
        entries.push({
            id: 'e' + entryId++,
            date: date,
            camionId: trucks.get(matricule).id,
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

// Output results
console.log('\n========================================');
console.log('📊 RÉSULTATS DE L\'EXTRACTION:');
console.log('========================================');
console.log(`   📦 ${trucks.size} camions`);
console.log(`   👤 ${drivers.size} chauffeurs`);
console.log(`   📝 ${entries.length} saisies`);
console.log('========================================\n');

// Generate JS code for data-firebase.js
const trucksArray = Array.from(trucks.values());
const driversArray = Array.from(drivers.values());

const outputData = {
    trucks: trucksArray,
    drivers: driversArray,
    entries: entries,
    settings: { defaultFuelPrice: 2, currency: 'TND' }
};

// Save as JSON
fs.writeFileSync('excel_data.json', JSON.stringify(outputData, null, 2));
console.log('✅ Données sauvegardées dans excel_data.json');

// Generate JavaScript code
let jsCode = `// Data extracted from Excel on ${new Date().toISOString()}\n\n`;

jsCode += `const EXCEL_TRUCKS = ${JSON.stringify(trucksArray, null, 2)};\n\n`;
jsCode += `const EXCEL_DRIVERS = ${JSON.stringify(driversArray, null, 2)};\n\n`;
jsCode += `const EXCEL_ENTRIES = ${JSON.stringify(entries, null, 2)};\n\n`;
jsCode += `const EXCEL_SETTINGS = { defaultFuelPrice: 2, currency: 'TND' };\n`;

fs.writeFileSync('excel_data.js', jsCode);
console.log('✅ Code JavaScript sauvegardé dans excel_data.js');

// Print summary
console.log('\n📦 CAMIONS:');
trucksArray.forEach(t => console.log(`   ${t.id}: ${t.matricule} (${t.type})`));

console.log('\n👤 CHAUFFEURS:');
driversArray.forEach(d => console.log(`   ${d.id}: ${d.nom}`));

console.log('\n📝 SAISIES (5 premières):');
entries.slice(0, 5).forEach(e => console.log(`   ${e.date}: ${e.destination} - ${e.kilometrage}km`));
