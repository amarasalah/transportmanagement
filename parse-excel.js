/**
 * Excel Data Parser
 * Extracts data from Tableau_suivi_journalier_camion.xlsx
 */

const XLSX = require('xlsx');
const fs = require('fs');

// Read Excel file
const workbook = XLSX.readFile('Tableau_suivi_journalier_camion.xlsx');

console.log('📊 Analyse du fichier Excel...\n');
console.log('Feuilles trouvées:', workbook.SheetNames);

// Parse each sheet
workbook.SheetNames.forEach(sheetName => {
    console.log(`\n=== Feuille: ${sheetName} ===`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Show first 10 rows
    console.log('Premières lignes:');
    data.slice(0, 15).forEach((row, i) => {
        console.log(`  ${i}: ${JSON.stringify(row.slice(0, 15))}`);
    });
    console.log(`  ... (${data.length} lignes total)`);
});

// Try to extract trucks and entries
console.log('\n\n📦 Extraction des données...\n');

// Look for the main data sheet
const mainSheet = workbook.Sheets[workbook.SheetNames[0]];
const allData = XLSX.utils.sheet_to_json(mainSheet, { header: 1, defval: '' });

// Find trucks list (first columns typically)
const trucks = new Map();
const drivers = new Map();
const entries = [];

// Analyze structure
let headerRow = -1;
for (let i = 0; i < Math.min(20, allData.length); i++) {
    const row = allData[i];
    const rowStr = row.join(' ').toLowerCase();
    if (rowStr.includes('matricule') || rowStr.includes('camion') || rowStr.includes('chauffeur')) {
        headerRow = i;
        console.log(`En-tête trouvé à la ligne ${i}:`, row.slice(0, 12));
        break;
    }
}

// Parse trucks from column data
console.log('\n📦 Camions détectés:');
let truckCount = 0;
for (let i = 0; i < allData.length && truckCount < 20; i++) {
    const row = allData[i];
    for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '');
        // Match Tunisian truck plates (format: XXXX TU XXX)
        if (/^\d+\s*TU\s*\d+$/i.test(cell.trim())) {
            if (!trucks.has(cell.trim())) {
                trucks.set(cell.trim(), { row: i, col: j });
                console.log(`  - ${cell.trim()}`);
                truckCount++;
            }
        }
    }
}

// Output summary
console.log('\n\n========================================');
console.log('RÉSUMÉ:');
console.log(`  - ${trucks.size} camions uniques trouvés`);
console.log(`  - ${allData.length} lignes dans la feuille principale`);
console.log('========================================');

// Save extracted data as JSON
const extractedData = {
    trucks: Array.from(trucks.keys()),
    sheetNames: workbook.SheetNames,
    rowCount: allData.length,
    sampleData: allData.slice(0, 30)
};

fs.writeFileSync('extracted_data.json', JSON.stringify(extractedData, null, 2));
console.log('\n✅ Données sauvegardées dans extracted_data.json');
