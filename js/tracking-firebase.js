/**
 * TRACKING MODULE - FIREBASE VERSION
 * GPS Map Tracking using Leaflet.js + OpenStreetMap (Free)
 */

import { db, collection, doc, updateDoc, COLLECTIONS } from './firebase.js';
import { DataModule } from './data-firebase.js';

let map = null;
let markers = {};
let autoRefreshInterval = null;

// Tunisia center coordinates
const TUNISIA_CENTER = [36.8065, 10.1815];
const DEFAULT_ZOOM = 7;

// Truck type colors
const TYPE_COLORS = {
    PLATEAU: '#3b82f6',
    BENNE: '#f59e0b',
    CITERNE: '#10b981'
};

function init() {
    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
        console.warn('⚠️ Leaflet not loaded yet, GPS tracking unavailable');
    }
}

async function refresh() {
    if (typeof L === 'undefined') {
        const container = document.getElementById('trackingMap');
        if (container) container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;font-size:16px">⚠️ Carte non disponible — vérifiez votre connexion internet</div>';
        return;
    }
    if (!map) {
        initMap();
    }
    if (map) {
        setTimeout(() => map.invalidateSize(), 300);
        await loadTruckPositions();
        startAutoRefresh();
    }
}

function initMap() {
    const container = document.getElementById('trackingMap');
    if (!container || map) return;

    // Initialize Leaflet map
    map = L.map('trackingMap', {
        center: TUNISIA_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true
    });

    // OpenStreetMap tiles (free)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
    }).addTo(map);

    // Admin: click map to set truck position
    const user = window.currentUser;
    if (user?.role === 'super_admin' || !user?.driverId) {
        map.on('click', (e) => showSetPositionMenu(e.latlng));
    }

    // Fix map rendering after page switch
    setTimeout(() => map.invalidateSize(), 200);
}

function createTruckIcon(type, hasLocation) {
    const color = TYPE_COLORS[type] || '#6366f1';
    const opacity = hasLocation ? 1 : 0.4;

    return L.divIcon({
        className: 'truck-marker',
        html: `<div style="
            width:40px;height:40px;border-radius:50%;
            background:${color};opacity:${opacity};
            display:flex;align-items:center;justify-content:center;
            font-size:20px;color:#fff;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            border:3px solid #fff;
            transition:transform 0.3s;
            cursor:pointer;
        ">🚛</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -24]
    });
}

async function loadTruckPositions() {
    try {
        const trucks = await DataModule.getTrucks();
        const drivers = await DataModule.getDrivers();
        const entries = DataModule.getEntries ? DataModule.getEntries() : [];

        // Update info panel
        renderInfoPanel(trucks, drivers);

        // Clear old markers
        Object.values(markers).forEach(m => map?.removeLayer(m));
        markers = {};

        trucks.forEach(truck => {
            const driver = drivers.find(d => d.camionId === truck.id);
            const loc = truck.lastLocation;

            // Default to Tunisia center with offset if no location
            const lat = loc?.lat || (TUNISIA_CENTER[0] + (Math.random() - 0.5) * 2);
            const lng = loc?.lng || (TUNISIA_CENTER[1] + (Math.random() - 0.5) * 2);
            const hasLocation = !!loc?.lat;

            const icon = createTruckIcon(truck.type, hasLocation);
            const marker = L.marker([lat, lng], { icon }).addTo(map);

            // Popup content
            const lastUpdate = loc?.timestamp
                ? new Date(loc.timestamp).toLocaleString('fr-FR')
                : 'Jamais';

            marker.bindPopup(`
                <div style="min-width:200px;font-family:Inter,sans-serif">
                    <div style="font-weight:700;font-size:15px;margin-bottom:8px;color:#1e293b">
                        🚛 ${truck.matricule}
                    </div>
                    <div style="display:grid;gap:4px;font-size:13px;color:#475569">
                        <div><strong>Type:</strong> <span style="color:${TYPE_COLORS[truck.type] || '#6366f1'};font-weight:600">${truck.type}</span></div>
                        <div><strong>Chauffeur:</strong> ${driver?.nom || 'Non assigné'}</div>
                        <div><strong>Position:</strong> ${hasLocation ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Non définie'}</div>
                        <div><strong>Dernière MAJ:</strong> ${lastUpdate}</div>
                    </div>
                    ${window.currentUser?.role === 'super_admin' ? `
                    <div style="margin-top:10px;border-top:1px solid #e2e8f0;padding-top:8px">
                        <button onclick="TrackingModule.centerOnTruck('${truck.id}')"
                            style="padding:4px 10px;background:#3b82f6;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;margin-right:4px">📍 Centrer</button>
                        <button onclick="TrackingModule.removeTruckLocation('${truck.id}')"
                            style="padding:4px 10px;background:#ef4444;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px">🗑️ Supprimer pos.</button>
                    </div>` : ''}
                </div>
            `);

            markers[truck.id] = marker;
        });

    } catch (err) {
        console.error('Error loading truck positions:', err);
    }
}

function renderInfoPanel(trucks, drivers) {
    const panel = document.getElementById('trackingInfoPanel');
    if (!panel) return;

    const withLoc = trucks.filter(t => t.lastLocation?.lat).length;
    const total = trucks.length;

    panel.innerHTML = `
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
            <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(15,23,42,0.4);border-radius:8px;border:1px solid rgba(148,163,184,0.1)">
                <span style="font-size:18px">🚛</span>
                <div>
                    <div style="font-size:18px;font-weight:700;color:#f1f5f9">${total}</div>
                    <div style="font-size:11px;color:#64748b">Camions</div>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(16,185,129,0.1);border-radius:8px;border:1px solid rgba(16,185,129,0.2)">
                <span style="font-size:18px">📍</span>
                <div>
                    <div style="font-size:18px;font-weight:700;color:#10b981">${withLoc}</div>
                    <div style="font-size:11px;color:#64748b">Localisés</div>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(239,68,68,0.1);border-radius:8px;border:1px solid rgba(239,68,68,0.2)">
                <span style="font-size:18px">❓</span>
                <div>
                    <div style="font-size:18px;font-weight:700;color:#ef4444">${total - withLoc}</div>
                    <div style="font-size:11px;color:#64748b">Non localisés</div>
                </div>
            </div>
            <!-- Legend -->
            <div style="display:flex;gap:12px;margin-left:auto;font-size:12px;color:#94a3b8">
                <span><span style="display:inline-block;width:12px;height:12px;background:#3b82f6;border-radius:50%;margin-right:4px"></span>Plateau</span>
                <span><span style="display:inline-block;width:12px;height:12px;background:#f59e0b;border-radius:50%;margin-right:4px"></span>Benne</span>
                <span><span style="display:inline-block;width:12px;height:12px;background:#10b981;border-radius:50%;margin-right:4px"></span>Citerne</span>
            </div>
            <button onclick="TrackingModule.refreshPositions()" style="padding:8px 16px;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">🔄 Actualiser</button>
        </div>
    `;
}

async function showSetPositionMenu(latlng) {
    const trucks = await DataModule.getTrucks();
    const drivers = await DataModule.getDrivers();

    const popup = L.popup()
        .setLatLng(latlng)
        .setContent(`
            <div style="font-family:Inter,sans-serif;min-width:220px">
                <div style="font-weight:700;font-size:14px;margin-bottom:8px;color:#1e293b">📍 Définir position</div>
                <div style="font-size:12px;color:#64748b;margin-bottom:10px">${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}</div>
                <div style="max-height:200px;overflow-y:auto">
                    ${trucks.map(t => {
            const d = drivers.find(dr => dr.camionId === t.id);
            return `<div onclick="TrackingModule.setTruckPosition('${t.id}',${latlng.lat},${latlng.lng})"
                            style="padding:8px;cursor:pointer;border-radius:6px;margin-bottom:2px;font-size:13px;transition:background 0.2s;color:#1e293b"
                            onmouseover="this.style.background='#e0e7ff'" onmouseout="this.style.background='transparent'">
                            <strong style="color:${TYPE_COLORS[t.type] || '#6366f1'}">🚛 ${t.matricule}</strong>
                            <span style="color:#64748b"> · ${d?.nom || 'Non assigné'}</span>
                        </div>`;
        }).join('')}
                </div>
            </div>
        `)
        .openOn(map);
}

async function setTruckPosition(truckId, lat, lng) {
    try {
        await updateDoc(doc(db, COLLECTIONS.trucks, truckId), {
            lastLocation: { lat, lng, timestamp: new Date().toISOString() }
        });
        map.closePopup();
        await loadTruckPositions();
    } catch (err) {
        console.error('Error setting truck position:', err);
    }
}

async function removeTruckLocation(truckId) {
    if (!confirm('Supprimer la position de ce camion ?')) return;
    try {
        await updateDoc(doc(db, COLLECTIONS.trucks, truckId), {
            lastLocation: null
        });
        await loadTruckPositions();
    } catch (err) {
        console.error('Error removing location:', err);
    }
}

function centerOnTruck(truckId) {
    const marker = markers[truckId];
    if (marker) {
        map.setView(marker.getLatLng(), 14);
        marker.openPopup();
    }
}

function fitAllTrucks() {
    const markerList = Object.values(markers);
    if (markerList.length === 0) return;
    const group = L.featureGroup(markerList);
    map.fitBounds(group.getBounds().pad(0.1));
}

// Chauffeur: share own location
async function shareMyLocation() {
    const user = window.currentUser;
    if (!user?.driverId) return;

    if (!navigator.geolocation) {
        console.warn('Geolocation not supported');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const { latitude, longitude } = pos.coords;
            // Find the truck assigned to this driver
            const drivers = await DataModule.getDrivers();
            const driver = drivers.find(d => d.id === user.driverId);
            if (!driver?.camionId) return;

            await updateDoc(doc(db, COLLECTIONS.trucks, driver.camionId), {
                lastLocation: {
                    lat: latitude,
                    lng: longitude,
                    timestamp: new Date().toISOString(),
                    source: 'gps'
                }
            });
            console.log('📍 Location shared:', latitude, longitude);
        },
        (err) => console.warn('Geolocation error:', err),
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => {
        loadTruckPositions();
        // Chauffeur: auto-share location
        if (window.currentUser?.driverId) shareMyLocation();
    }, 30000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

async function refreshPositions() {
    await loadTruckPositions();
}

function destroy() {
    stopAutoRefresh();
    if (map) {
        map.remove();
        map = null;
    }
    markers = {};
}

export const TrackingModule = {
    init, refresh, destroy,
    setTruckPosition, removeTruckLocation,
    centerOnTruck, fitAllTrucks,
    shareMyLocation, refreshPositions
};
window.TrackingModule = TrackingModule;
