/**
 * EXCEL IMPORT MODULE - FIREBASE VERSION
 * Parses Excel files and saves data directly to Firebase
 */

import { db, collection, doc, setDoc, COLLECTIONS } from './firebase.js';
import { DataModule } from './data-firebase.js';

let selectedFile = null;
let parsedData = null;

function init() {
    setupDropZone();
    setupImportButton();
    console.log('📊 ExcelImportModule initialized');
}

function setupDropZone() {
    const dropZone = document.getElementById('excelDropZone');
    const fileInput = document.getElementById('excelFileInput');

    if (!dropZone || !fileInput) return;

    // Click to select file
    dropZone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#8b5cf6';
        dropZone.style.background = 'rgba(139, 92, 246, 0.1)';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'rgba(139, 92, 246, 0.5)';
        dropZone.style.background = 'transparent';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'rgba(139, 92, 246, 0.5)';
        dropZone.style.background = 'transparent';

        const files = e.dataTransfer.files;
        if (files.length > 0 && (files[0].name.endsWith('.xlsx') || files[0].name.endsWith('.xls'))) {
            handleFile(files[0]);
        } else {
            alert('Veuillez sélectionner un fichier Excel (.xlsx ou .xls)');
        }
    });
}

function setupImportButton() {
    const importBtn = document.getElementById('importExcelBtn');
    if (importBtn) {
        importBtn.addEventListener('click', () => importToFirebase());
    }
}

async function handleFile(file) {
    selectedFile = file;
    const dropZone = document.getElementById('excelDropZone');
    const importBtn = document.getElementById('importExcelBtn');

    // Update UI
    dropZone.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 10px;">✅</div>
        <p style="color: #10b981; font-weight: 500;">${file.name}</p>
        <p style="color: #64748b; font-size: 0.875rem;">${(file.size / 1024).toFixed(1)} KB - Prêt à importer</p>
    `;

    // Parse the file
    try {
        parsedData = await parseExcelFile(file);
        console.log('📊 Parsed data:', parsedData);

        // Enable import button
        if (importBtn) {
            importBtn.disabled = false;
            importBtn.textContent = `📥 Importer ${parsedData.entries?.length || 0} saisies`;
        }
    } catch (error) {
        console.error('Error parsing Excel:', error);
        dropZone.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 10px;">❌</div>
            <p style="color: #ef4444; font-weight: 500;">Erreur de lecture</p>
            <p style="color: #64748b; font-size: 0.875rem;">${error.message}</p>
        `;
    }
}

async function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });

                const result = {
                    trucks: [],
                    drivers: [],
                    entries: []
                };

                // Process each sheet
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

                    // Try to parse as entries (main data)
                    const entries = parseEntriesSheet(jsonData, sheetName);
                    result.entries.push(...entries);
                });

                // Extract unique trucks and drivers from entries
                result.trucks = extractTrucks(result.entries);
                result.drivers = extractDrivers(result.entries);

                resolve(result);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
        reader.readAsArrayBuffer(file);
    });
}

function parseEntriesSheet(data, sheetName) {
    const entries = [];

    // Skip summary sheets
    if (sheetName.toLowerCase().includes('recap') || sheetName.toLowerCase().includes('récap')) {
        console.log(`Sheet ${sheetName}: Summary sheet, skipping`);
        return entries;
    }

    // Find header row (look for "Matricule camion" or "N°")
    let headerIndex = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i];
        if (row && row.some(cell => {
            const cellStr = String(cell).toLowerCase();
            return cellStr.includes('matricule') || cellStr.includes('n°') && cellStr.includes('camion');
        })) {
            headerIndex = i;
            break;
        }
    }

    if (headerIndex === -1) {
        console.log(`Sheet ${sheetName}: No header found, skipping`);
        return entries;
    }

    // Get date from sheet name (format: DD-MM-YY) or from row 2
    let dateStr = '';
    const dateMatch = sheetName.match(/(\d{2})-(\d{2})-(\d{2})/);
    if (dateMatch) {
        const [, day, month, year] = dateMatch;
        dateStr = `20${year}-${month}-${day}`;
    } else {
        // Try to get date from row 2 (Excel serial date in column 2)
        const dateVal = data[2]?.[2];
        if (typeof dateVal === 'number') {
            const excelEpoch = new Date(1899, 11, 30);
            const date = new Date(excelEpoch.getTime() + dateVal * 86400000);
            dateStr = date.toISOString().split('T')[0];
        }
    }

    if (!dateStr) {
        dateStr = new Date().toISOString().split('T')[0];
    }

    console.log(`Sheet ${sheetName}: Date = ${dateStr}, Header at row ${headerIndex}`);

    // Column indices based on analysis (0-indexed):
    // 0: N°, 1: Matricule, 2: Chauffeur, 3: Type transport, 4: Destination
    // 5: KM jour, 6: KM global, 7: Gasoil (L), 8: Prix gasoil/L, 9: Montant gasoil
    // 10: Charges fixes, 11: Assurance, 12: Taxe, 13: Maintenance, 14: Charge personnel
    // 15: Coût total, 16: Prix livraison, 17: Résultat, 18: Remarques

    // Parse data rows (skip header and TOTAL rows)
    for (let i = headerIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 2) continue;

        // Skip TOTAL row and empty rows
        const firstCell = String(row[0] || '').toLowerCase();
        if (firstCell.includes('total')) continue;

        // Skip if no matricule or row number > 18 (empty template rows)
        const rowNum = parseInt(row[0]);
        const matricule = String(row[1] || '').trim();

        if (!matricule || rowNum > 18) continue;

        const chauffeur = String(row[2] || '').trim();
        const typeTransport = String(row[3] || '').trim();
        const destination = String(row[4] || '').trim();

        const entry = {
            id: `entry_${dateStr}_${matricule}_${i}`.replace(/\s+/g, '_'),
            date: dateStr,
            matricule: matricule,
            chauffeur: chauffeur,
            typeTransport: typeTransport,
            destination: destination,
            origine: 'GABES', // Default origin
            km: parseFloat(row[5]) || 0,
            kmGlobal: parseFloat(row[6]) || 0,
            gasoil: parseFloat(row[7]) || 0,
            prixGasoil: parseFloat(row[8]) || 2,
            coutGasoil: parseFloat(row[9]) || 0,
            chargesFixes: parseFloat(row[10]) || 0,
            assurance: parseFloat(row[11]) || 0,
            taxe: parseFloat(row[12]) || 0,
            maintenance: parseFloat(row[13]) || 0,
            chargePersonnel: parseFloat(row[14]) || 0,
            coutTotal: parseFloat(row[15]) || 0,
            recette: parseFloat(row[16]) || 0,
            resultat: parseFloat(row[17]) || 0,
            remarques: String(row[18] || '').trim(),
            importedAt: new Date().toISOString(),
            source: 'excel_import'
        };

        // Calculate if not already calculated
        if (!entry.coutGasoil && entry.gasoil > 0) {
            entry.coutGasoil = entry.gasoil * entry.prixGasoil;
        }

        // Calculate total expenses
        entry.depenses = entry.chargesFixes + entry.assurance + entry.taxe +
            entry.maintenance + entry.chargePersonnel;
        entry.totalDepenses = entry.coutGasoil + entry.depenses;

        if (!entry.resultat && entry.recette > 0) {
            entry.resultat = entry.recette - entry.totalDepenses;
        }

        entries.push(entry);
    }

    console.log(`Sheet ${sheetName}: ${entries.length} entries parsed`);
    return entries;
}

function findColumnIndex(headers, keywords) {
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        if (keywords.some(kw => header.includes(kw))) {
            return i;
        }
    }
    return -1;
}

function extractTrucks(entries) {
    const trucksMap = new Map();
    entries.forEach(e => {
        if (e.matricule && !trucksMap.has(e.matricule)) {
            trucksMap.set(e.matricule, {
                id: `truck_${e.matricule.replace(/\s+/g, '_')}`,
                matricule: e.matricule,
                marque: 'Import',
                createdAt: new Date().toISOString()
            });
        }
    });
    return Array.from(trucksMap.values());
}

function extractDrivers(entries) {
    const driversMap = new Map();
    entries.forEach(e => {
        if (e.chauffeur && !driversMap.has(e.chauffeur)) {
            driversMap.set(e.chauffeur, {
                id: `driver_${e.chauffeur.replace(/\s+/g, '_')}`,
                nom: e.chauffeur,
                telephone: '',
                createdAt: new Date().toISOString()
            });
        }
    });
    return Array.from(driversMap.values());
}

async function importToFirebase() {
    if (!parsedData) {
        alert('Aucun fichier à importer');
        return;
    }

    const statusDiv = document.getElementById('excelImportStatus');
    const progressBar = document.getElementById('importProgressBar');
    const progressText = document.getElementById('importProgressText');
    const importBtn = document.getElementById('importExcelBtn');

    statusDiv.style.display = 'block';
    importBtn.disabled = true;

    try {
        // Check for existing data first
        progressText.textContent = 'Vérification des doublons...';
        progressBar.style.width = '5%';

        const existingEntries = await DataModule.getEntries();
        const existingTrucks = await DataModule.getTrucks();
        const existingDrivers = await DataModule.getDrivers();

        // Find duplicates
        const existingEntryIds = new Set(existingEntries.map(e => e.id));
        const existingTruckIds = new Set(existingTrucks.map(t => t.id));
        const existingDriverIds = new Set(existingDrivers.map(d => d.id));

        // Also check by date+matricule for entries
        const existingEntryKeys = new Set(existingEntries.map(e => `${e.date}_${e.matricule}`));

        const duplicateEntries = parsedData.entries.filter(e =>
            existingEntryIds.has(e.id) || existingEntryKeys.has(`${e.date}_${e.matricule}`)
        );
        const duplicateTrucks = parsedData.trucks.filter(t => existingTruckIds.has(t.id));
        const duplicateDrivers = parsedData.drivers.filter(d => existingDriverIds.has(d.id));

        const newEntries = parsedData.entries.filter(e =>
            !existingEntryIds.has(e.id) && !existingEntryKeys.has(`${e.date}_${e.matricule}`)
        );
        const newTrucks = parsedData.trucks.filter(t => !existingTruckIds.has(t.id));
        const newDrivers = parsedData.drivers.filter(d => !existingDriverIds.has(d.id));

        progressBar.style.width = '10%';

        // If duplicates found, ask user
        if (duplicateEntries.length > 0 || duplicateTrucks.length > 0 || duplicateDrivers.length > 0) {
            const message = `⚠️ Données existantes détectées!\n\n` +
                `Doublons trouvés:\n` +
                `- ${duplicateEntries.length} saisies existantes\n` +
                `- ${duplicateTrucks.length} camions existants\n` +
                `- ${duplicateDrivers.length} chauffeurs existants\n\n` +
                `Nouvelles données à importer:\n` +
                `- ${newEntries.length} nouvelles saisies\n` +
                `- ${newTrucks.length} nouveaux camions\n` +
                `- ${newDrivers.length} nouveaux chauffeurs\n\n` +
                `Voulez-vous:\n` +
                `OK = Importer uniquement les nouvelles données\n` +
                `Annuler = Ne rien importer`;

            if (!confirm(message)) {
                progressText.innerHTML = `<span style="color: #f59e0b;">⚠️ Import annulé par l'utilisateur</span>`;
                importBtn.disabled = false;
                return;
            }

            // Use only new data
            parsedData.entries = newEntries;
            parsedData.trucks = newTrucks;
            parsedData.drivers = newDrivers;
        }

        // Check if nothing to import
        if (parsedData.entries.length === 0 && parsedData.trucks.length === 0 && parsedData.drivers.length === 0) {
            progressText.innerHTML = `<span style="color: #f59e0b;">⚠️ Aucune nouvelle donnée à importer - tout existe déjà!</span>`;
            importBtn.disabled = false;
            return;
        }

        const total = (parsedData.trucks?.length || 0) +
            (parsedData.drivers?.length || 0) +
            (parsedData.entries?.length || 0);
        let current = 0;

        // Import trucks
        progressText.textContent = 'Importation des camions...';
        for (const truck of parsedData.trucks || []) {
            await setDoc(doc(db, COLLECTIONS.trucks, truck.id), truck);
            current++;
            progressBar.style.width = `${10 + (current / total) * 90}%`;
        }

        // Import drivers
        progressText.textContent = 'Importation des chauffeurs...';
        for (const driver of parsedData.drivers || []) {
            await setDoc(doc(db, COLLECTIONS.drivers, driver.id), driver);
            current++;
            progressBar.style.width = `${10 + (current / total) * 90}%`;
        }

        // Import entries
        progressText.textContent = 'Importation des saisies...';
        for (const entry of parsedData.entries || []) {
            await setDoc(doc(db, COLLECTIONS.entries, entry.id), entry);
            current++;
            progressBar.style.width = `${10 + (current / total) * 90}%`;
        }

        progressBar.style.width = '100%';
        progressText.innerHTML = `<span style="color: #10b981;">✅ Import terminé! ${parsedData.trucks?.length || 0} camions, ${parsedData.drivers?.length || 0} chauffeurs, ${parsedData.entries?.length || 0} saisies</span>`;

        // Refresh data
        await DataModule.init();

        alert(`Import réussi!\n\n${parsedData.trucks?.length || 0} camions\n${parsedData.drivers?.length || 0} chauffeurs\n${parsedData.entries?.length || 0} saisies`);

    } catch (error) {
        console.error('Import error:', error);
        progressText.innerHTML = `<span style="color: #ef4444;">❌ Erreur: ${error.message}</span>`;
        alert('Erreur lors de l\'import: ' + error.message);
    }

    importBtn.disabled = false;
}

export const ExcelImportModule = {
    init,
    handleFile,
    importToFirebase
};

window.ExcelImportModule = ExcelImportModule;
