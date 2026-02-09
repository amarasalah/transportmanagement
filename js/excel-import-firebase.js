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

    // Update UI - loading state
    dropZone.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 10px;">⏳</div>
        <p style="color: #f59e0b; font-weight: 500;">Analyse en cours...</p>
        <p style="color: #64748b; font-size: 0.875rem;">${file.name}</p>
    `;

    // Parse the file
    try {
        parsedData = await parseExcelFile(file);
        console.log('📊 Parsed data:', parsedData);

        // Check for existing data in Firebase
        const existingData = await checkExistingData(parsedData);
        parsedData.existingEntries = existingData.existingEntries;
        parsedData.newEntries = existingData.newEntries;
        parsedData.existingTrucks = existingData.existingTrucks;
        parsedData.newTrucks = existingData.newTrucks;
        parsedData.existingDrivers = existingData.existingDrivers;
        parsedData.newDrivers = existingData.newDrivers;

        // Update UI with results
        const hasExisting = existingData.existingEntries.length > 0 ||
            existingData.existingTrucks.length > 0 ||
            existingData.existingDrivers.length > 0;

        const statusIcon = hasExisting ? '⚠️' : '✅';
        const statusColor = hasExisting ? '#f59e0b' : '#10b981';

        dropZone.innerHTML = `
            <div style="font-size: 2.5rem; margin-bottom: 10px;">${statusIcon}</div>
            <p style="color: ${statusColor}; font-weight: 500;">${file.name}</p>
            <div style="text-align: left; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-top: 10px; font-size: 0.8rem;">
                <p style="color: #10b981;">✅ Nouveaux: ${existingData.newEntries.length} saisies, ${existingData.newTrucks.length} camions, ${existingData.newDrivers.length} chauffeurs</p>
                ${hasExisting ? `<p style="color: #f59e0b; margin-top: 5px;">⚠️ Existants: ${existingData.existingEntries.length} saisies, ${existingData.existingTrucks.length} camions, ${existingData.existingDrivers.length} chauffeurs</p>` : ''}
            </div>
        `;

        // Enable import button
        if (importBtn) {
            importBtn.disabled = false;
            const newCount = existingData.newEntries.length;
            const existingCount = existingData.existingEntries.length;
            if (newCount === 0 && existingCount > 0) {
                importBtn.textContent = `⚠️ Toutes les données existent déjà`;
                importBtn.disabled = true;
            } else if (existingCount > 0) {
                importBtn.textContent = `📥 Importer ${newCount} nouvelles (${existingCount} ignorées)`;
            } else {
                importBtn.textContent = `📥 Importer ${newCount} saisies`;
            }
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

async function checkExistingData(data) {
    // Get existing data from Firebase
    const existingEntries = await DataModule.getEntries();
    const existingTrucks = await DataModule.getTrucks();
    const existingDrivers = await DataModule.getDrivers();

    const existingEntryIds = new Set(existingEntries.map(e => e.id));
    const existingTruckIds = new Set(existingTrucks.map(t => t.id));
    const existingDriverIds = new Set(existingDrivers.map(d => d.id));

    // Also check by date + matricule for entries (more reliable duplicate detection)
    const existingEntryKeys = new Set(existingEntries.map(e => `${e.date}_${e.matricule}`));

    const result = {
        existingEntries: [],
        newEntries: [],
        existingTrucks: [],
        newTrucks: [],
        existingDrivers: [],
        newDrivers: []
    };

    // Check entries
    for (const entry of data.entries || []) {
        const key = `${entry.date}_${entry.matricule}`;
        if (existingEntryIds.has(entry.id) || existingEntryKeys.has(key)) {
            result.existingEntries.push(entry);
        } else {
            result.newEntries.push(entry);
        }
    }

    // Check trucks
    for (const truck of data.trucks || []) {
        const existsByMatricule = existingTrucks.some(t => t.matricule === truck.matricule);
        if (existingTruckIds.has(truck.id) || existsByMatricule) {
            result.existingTrucks.push(truck);
        } else {
            result.newTrucks.push(truck);
        }
    }

    // Check drivers
    for (const driver of data.drivers || []) {
        const existsByName = existingDrivers.some(d => d.nom === driver.nom);
        if (existingDriverIds.has(driver.id) || existsByName) {
            result.existingDrivers.push(driver);
        } else {
            result.newDrivers.push(driver);
        }
    }

    console.log('📊 Duplicate check:', result);
    return result;
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

    // Check if there are any new entries to import
    const newTrucks = parsedData.newTrucks || [];
    const newDrivers = parsedData.newDrivers || [];
    const newEntries = parsedData.newEntries || [];

    if (newTrucks.length === 0 && newDrivers.length === 0 && newEntries.length === 0) {
        alert('⚠️ Aucune nouvelle donnée à importer!\n\nToutes les données du fichier Excel existent déjà dans la base.');
        return;
    }

    const statusDiv = document.getElementById('excelImportStatus');
    const progressBar = document.getElementById('importProgressBar');
    const progressText = document.getElementById('importProgressText');
    const importBtn = document.getElementById('importExcelBtn');

    statusDiv.style.display = 'block';
    importBtn.disabled = true;

    try {
        const total = newTrucks.length + newDrivers.length + newEntries.length;
        let current = 0;

        // Import only NEW trucks
        if (newTrucks.length > 0) {
            progressText.textContent = `Importation des camions (${newTrucks.length} nouveaux)...`;
            for (const truck of newTrucks) {
                await setDoc(doc(db, COLLECTIONS.trucks, truck.id), truck);
                current++;
                progressBar.style.width = `${(current / total) * 100}%`;
            }
        }

        // Import only NEW drivers
        if (newDrivers.length > 0) {
            progressText.textContent = `Importation des chauffeurs (${newDrivers.length} nouveaux)...`;
            for (const driver of newDrivers) {
                await setDoc(doc(db, COLLECTIONS.drivers, driver.id), driver);
                current++;
                progressBar.style.width = `${(current / total) * 100}%`;
            }
        }

        // Import only NEW entries
        if (newEntries.length > 0) {
            progressText.textContent = `Importation des saisies (${newEntries.length} nouvelles)...`;
            for (const entry of newEntries) {
                await setDoc(doc(db, COLLECTIONS.entries, entry.id), entry);
                current++;
                progressBar.style.width = `${(current / total) * 100}%`;
            }
        }

        progressBar.style.width = '100%';

        // Summary with skipped counts
        const skippedTrucks = parsedData.existingTrucks?.length || 0;
        const skippedDrivers = parsedData.existingDrivers?.length || 0;
        const skippedEntries = parsedData.existingEntries?.length || 0;

        let summary = `✅ Import terminé!\n\n`;
        summary += `📥 Importés:\n`;
        summary += `   • ${newTrucks.length} camions\n`;
        summary += `   • ${newDrivers.length} chauffeurs\n`;
        summary += `   • ${newEntries.length} saisies\n`;

        if (skippedTrucks > 0 || skippedDrivers > 0 || skippedEntries > 0) {
            summary += `\n⏭️ Ignorés (déjà existants):\n`;
            if (skippedTrucks > 0) summary += `   • ${skippedTrucks} camions\n`;
            if (skippedDrivers > 0) summary += `   • ${skippedDrivers} chauffeurs\n`;
            if (skippedEntries > 0) summary += `   • ${skippedEntries} saisies\n`;
        }

        progressText.innerHTML = `<span style="color: #10b981;">✅ Import terminé! ${newTrucks.length} camions, ${newDrivers.length} chauffeurs, ${newEntries.length} saisies</span>`;

        // Refresh data
        await DataModule.init();

        alert(summary);

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
