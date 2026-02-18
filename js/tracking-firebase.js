/**
 * TRACKING MODULE - FIREBASE VERSION
 * GPS Map Tracking using Leaflet.js + OpenStreetMap (Free)
 */

import { db, collection, doc, updateDoc, getDocs, onSnapshot, COLLECTIONS } from './firebase.js';
import { DataModule } from './data-firebase.js';

console.log('[GPS] ✅ tracking-firebase.js loaded successfully');

let map = null;
let markers = {};
let autoRefreshInterval = null;
let firestoreUnsubscribe = null;

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
    console.log('[GPS] refresh() called');
    if (typeof L === 'undefined') {
        const container = document.getElementById('trackingMap');
        if (container) container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ef4444;font-size:16px">⚠️ Carte non disponible — vérifiez votre connexion internet</div>';
        return;
    }

    // Destroy old map if it exists (handles page switching)
    if (map) {
        try { map.remove(); } catch(e) {}
        map = null;
        markers = {};
    }

    initMap();

    if (map) {
        // Give DOM time to render, then fix map size
        setTimeout(() => {
            map.invalidateSize();
            console.log('[GPS] Map size invalidated');
        }, 400);
        // Initial load with fresh Firestore data
        await loadTruckPositions();
        // Start real-time listener (will auto-update map on changes)
        startRealtimeListener();
        // Fallback polling every 30s
        startAutoRefresh();
    } else {
        console.error('[GPS] ❌ Map failed to initialize');
    }
}

function initMap() {
    const container = document.getElementById('trackingMap');
    if (!container) {
        console.error('[GPS] ❌ #trackingMap container not found in DOM');
        return;
    }
    // Clear container contents before initializing
    container.innerHTML = '';

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

async function loadTruckPositions(trucksOverride) {
    try {
        let trucks;
        if (trucksOverride) {
            // Use data passed directly from onSnapshot (no extra fetch needed)
            trucks = trucksOverride;
            console.log('[GPS] loadTruckPositions: using snapshot data (' + trucks.length + ' trucks)');
        } else {
            // Fallback: fetch fresh from Firestore
            const trucksSnap = await getDocs(collection(db, COLLECTIONS.trucks));
            trucks = trucksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            console.log('[GPS] loadTruckPositions: fetched ' + trucks.length + ' trucks from Firestore');
        }
        const drivers = await DataModule.getDrivers();

        // Log GPS data for each truck
        trucks.forEach(t => {
            if (t.lastLocation) {
                console.log(`[GPS] 🚛 ${t.matricule} → lat=${t.lastLocation.lat}, lng=${t.lastLocation.lng}, source=${t.lastLocation.source}, time=${t.lastLocation.timestamp}`);
            }
        });

        // Update info panel
        renderInfoPanel(trucks, drivers);

        // Clear old markers
        Object.values(markers).forEach(m => map?.removeLayer(m));
        markers = {};

        trucks.forEach(truck => {
            const driver = drivers.find(d => d.camionId === truck.id);
            const loc = truck.lastLocation;

            // Parse coordinates as numbers (Firestore may return strings)
            const rawLat = loc?.lat;
            const rawLng = loc?.lng;
            const lat = parseFloat(rawLat);
            const lng = parseFloat(rawLng);
            const hasLocation = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

            // Only place marker if truck has a real GPS position
            let markerLat, markerLng;
            if (hasLocation) {
                markerLat = lat;
                markerLng = lng;
            } else {
                // No location: place at Tunisia center with offset (faded marker)
                markerLat = TUNISIA_CENTER[0] + (Math.random() - 0.5) * 2;
                markerLng = TUNISIA_CENTER[1] + (Math.random() - 0.5) * 2;
            }

            console.log(`[GPS] Marker: ${truck.matricule} → [${markerLat}, ${markerLng}] hasLocation=${hasLocation} raw=[${rawLat}, ${rawLng}]`);

            const icon = createTruckIcon(truck.type, hasLocation);
            const marker = L.marker([markerLat, markerLng], { icon }).addTo(map);

            // Popup content
            const lastUpdate = loc?.timestamp
                ? new Date(loc.timestamp).toLocaleString('fr-FR')
                : 'Jamais';

            // GPS source badge
            const sourceLabel = loc?.source === 'mobile_gps' ? '📱 GPS Mobile'
                : loc?.source === 'gps' ? '🌐 GPS Web'
                : loc?.source ? '📌 Manuel' : '';
            const sourceBadge = sourceLabel
                ? `<div style="margin-top:4px"><span style="display:inline-block;padding:2px 8px;background:rgba(139,92,246,0.1);border-radius:4px;font-size:11px;color:#8b5cf6;font-weight:600">${sourceLabel}</span></div>`
                : '';
            const speedVal = parseFloat(loc?.speed);
            const speedInfo = (!isNaN(speedVal) && speedVal >= 0)
                ? `<div><strong>Vitesse:</strong> ${(speedVal * 3.6).toFixed(0)} km/h</div>` : '';

            marker.bindPopup(`
                <div style="min-width:220px;font-family:Inter,sans-serif">
                    <div style="font-weight:700;font-size:15px;margin-bottom:8px;color:#1e293b">
                        🚛 ${truck.matricule}
                    </div>
                    <div style="display:grid;gap:4px;font-size:13px;color:#475569">
                        <div><strong>Type:</strong> <span style="color:${TYPE_COLORS[truck.type] || '#6366f1'};font-weight:600">${truck.type}</span></div>
                        <div><strong>Chauffeur:</strong> ${driver?.nom || 'Non assigné'}</div>
                        <div><strong>Position:</strong> ${hasLocation ? `${markerLat.toFixed(5)}, ${markerLng.toFixed(5)}` : 'Non définie'}</div>
                        ${speedInfo}
                        <div><strong>Dernière MAJ:</strong> ${lastUpdate}</div>
                        ${sourceBadge}
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
    const mobileGps = trucks.filter(t => t.lastLocation?.source === 'mobile_gps').length;
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
            <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(139,92,246,0.1);border-radius:8px;border:1px solid rgba(139,92,246,0.2)">
                <span style="font-size:18px">📱</span>
                <div>
                    <div style="font-size:18px;font-weight:700;color:#8b5cf6">${mobileGps}</div>
                    <div style="font-size:11px;color:#64748b">GPS Mobile</div>
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
            lastLocation: { lat, lng, timestamp: new Date().toISOString(), source: 'manual' }
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
    console.log('[GPS] Manual refresh triggered');
    await loadTruckPositions();
}

// Test function: simulate a mobile GPS update from browser console
// Usage: TrackingModule.testGpsUpdate('TRUCK_ID') or TrackingModule.testGpsUpdate() for first truck
async function testGpsUpdate(truckId) {
    try {
        if (!truckId) {
            const trucksSnap = await getDocs(collection(db, COLLECTIONS.trucks));
            if (trucksSnap.empty) { console.error('[GPS] No trucks found'); return; }
            truckId = trucksSnap.docs[0].id;
            console.log('[GPS] Using first truck:', truckId, trucksSnap.docs[0].data().matricule);
        }
        const testLat = 36.8 + (Math.random() - 0.5) * 0.1;
        const testLng = 10.18 + (Math.random() - 0.5) * 0.1;
        console.log(`[GPS] 🧪 Writing test GPS: truck=${truckId}, lat=${testLat.toFixed(5)}, lng=${testLng.toFixed(5)}`);
        await updateDoc(doc(db, COLLECTIONS.trucks, truckId), {
            lastLocation: {
                lat: testLat,
                lng: testLng,
                speed: 60,
                heading: 90,
                timestamp: new Date().toISOString(),
                source: 'mobile_gps'
            }
        });
        console.log('[GPS] ✅ Test GPS write successful! onSnapshot should fire now...');
    } catch (err) {
        console.error('[GPS] ❌ Test GPS write failed:', err);
    }
}

// Real-time Firestore listener for truck location updates (e.g. from mobile GPS)
function startRealtimeListener() {
    if (firestoreUnsubscribe) return; // already listening
    try {
        let isFirstSnapshot = true;
        firestoreUnsubscribe = onSnapshot(
            collection(db, COLLECTIONS.trucks),
            (snapshot) => {
                const allTrucks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                console.log(`[GPS] 📡 onSnapshot fired: ${allTrucks.length} trucks, isFirst=${isFirstSnapshot}`);

                // Log changes
                snapshot.docChanges().forEach(change => {
                    const data = change.doc.data();
                    console.log(`[GPS]   change: type=${change.type}, truck=${data.matricule || change.doc.id}, hasLocation=${!!data.lastLocation}`);
                    if (data.lastLocation) {
                        console.log(`[GPS]   → lat=${data.lastLocation.lat}, lng=${data.lastLocation.lng}, source=${data.lastLocation.source}`);
                    }
                });

                // Skip initial snapshot (we already loaded in refresh())
                if (isFirstSnapshot) {
                    isFirstSnapshot = false;
                    console.log('[GPS] 📡 Initial snapshot skipped (already loaded)');
                    return;
                }

                // Use snapshot data DIRECTLY to update map (no extra fetch)
                if (map) {
                    console.log('[GPS] 📡 Updating map with real-time data...');
                    loadTruckPositions(allTrucks);
                }
            },
            (err) => {
                console.error('[GPS] ❌ onSnapshot error:', err);
            }
        );
        console.log('[GPS] 📡 Real-time GPS listener started');
    } catch (err) {
        console.error('[GPS] ❌ Could not start realtime listener:', err);
    }
}

function stopRealtimeListener() {
    if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        firestoreUnsubscribe = null;
    }
}

function destroy() {
    stopAutoRefresh();
    stopRealtimeListener();
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
    shareMyLocation, refreshPositions,
    testGpsUpdate
};
window.TrackingModule = TrackingModule;
