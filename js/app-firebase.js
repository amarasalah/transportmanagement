/**
 * MAIN APPLICATION - FIREBASE VERSION
 * Handles navigation, initialization, and global functions
 */

import { DataModule } from './data-firebase.js';
import { DashboardModule } from './dashboard-firebase.js';
import { TrucksModule } from './trucks-firebase.js';
import { DriversModule } from './drivers-firebase.js';
import { EntriesModule } from './entries-firebase.js';
import { ReportsModule } from './reports-firebase.js';
import { ProfileModule } from './profile-firebase.js';

let currentPage = 'dashboard';
let selectedDate = new Date().toISOString().split('T')[0];

async function init() {
    console.log('🚛 FleetTrack - Initializing...');

    // Show loading
    showLoading();

    try {
        // Initialize Firebase data
        await DataModule.init();

        // Initialize modules
        DashboardModule.init();
        TrucksModule.init();
        DriversModule.init();
        EntriesModule.init();
        ReportsModule.init();
        ProfileModule.init();

        // Setup UI
        setupNavigation();
        setupDatePicker();
        setupModal();
        setupSettings();
        setupDataActions();
        updateDateDisplay();

        // Navigate to dashboard
        await navigateTo('dashboard');

        console.log('✅ FleetTrack ready!');

    } catch (error) {
        console.error('❌ Initialization error:', error);
        alert('Erreur de connexion à Firebase. Vérifiez votre connexion internet.');
    } finally {
        hideLoading();
    }
}

function showLoading() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
}

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateTo(page);
        });
    });

    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });
}

async function navigateTo(page) {
    currentPage = page;

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    document.getElementById(`page-${page}`)?.classList.add('active');

    const titles = {
        dashboard: 'Tableau de bord',
        entries: 'Saisie journalière',
        trucks: 'Gestion des Camions',
        drivers: 'Gestion des Chauffeurs',
        reports: 'Rapports Mensuels',
        settings: 'Paramètres'
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;

    await refreshCurrentPage();
}

async function refreshCurrentPage() {
    try {
        switch (currentPage) {
            case 'dashboard':
                await DashboardModule.refresh(selectedDate);
                break;
            case 'entries':
                await EntriesModule.refresh(selectedDate);
                break;
            case 'trucks':
                await TrucksModule.refresh();
                break;
            case 'drivers':
                await DriversModule.refresh();
                break;
            case 'reports':
                await ReportsModule.refresh();
                break;
        }
    } catch (error) {
        console.error('Page refresh error:', error);
    }
}

function setupDatePicker() {
    const datePicker = document.getElementById('selectedDate');
    if (datePicker) {
        datePicker.value = selectedDate;
        datePicker.addEventListener('change', async (e) => {
            selectedDate = e.target.value;
            updateDateDisplay();
            await refreshCurrentPage();
        });
    }
}

function updateDateDisplay() {
    const display = document.getElementById('currentDate');
    if (display) {
        const date = new Date(selectedDate);
        display.textContent = date.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
}

function setupModal() {
    const overlay = document.getElementById('modalOverlay');
    const closeBtn = document.getElementById('modalClose');
    const cancelBtn = document.getElementById('modalCancel');

    closeBtn?.addEventListener('click', hideModal);
    cancelBtn?.addEventListener('click', hideModal);
    overlay?.addEventListener('click', (e) => {
        if (e.target === overlay) hideModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideModal();
    });
}

function showModal() {
    document.getElementById('modalOverlay')?.classList.add('active');
}

function hideModal() {
    document.getElementById('modalOverlay')?.classList.remove('active');
}

async function setupSettings() {
    document.getElementById('saveFuelPrice')?.addEventListener('click', async () => {
        const price = parseFloat(document.getElementById('defaultFuelPrice').value) || 2;
        const settings = await DataModule.getSettings();
        settings.defaultFuelPrice = price;
        await DataModule.saveSettings(settings);
        alert('Prix gasoil enregistré: ' + price + ' TND/L');
    });

    const settings = await DataModule.getSettings();
    const priceInput = document.getElementById('defaultFuelPrice');
    if (priceInput) priceInput.value = settings.defaultFuelPrice;

    document.getElementById('resetDataBtn')?.addEventListener('click', async () => {
        if (confirm('Cette action va réinitialiser toutes les données aux valeurs par défaut. Continuer ?')) {
            await DataModule.resetData();
            location.reload();
        }
    });
}

function setupDataActions() {
    document.getElementById('exportBtn')?.addEventListener('click', exportData);
    document.getElementById('exportDataBtn')?.addEventListener('click', exportData);

    document.getElementById('importDataInput')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                await DataModule.importData(data);
                alert('Données importées avec succès!');
                location.reload();
            } catch (err) {
                alert('Erreur lors de l\'import: ' + err.message);
            }
        };
        reader.readAsText(file);
    });
}

async function exportData() {
    const data = await DataModule.exportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `fleettrack_firebase_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Export for global access
const App = {
    init,
    navigateTo,
    refreshCurrentPage,
    showModal,
    hideModal
};

window.App = App;

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', init);

export { App };
