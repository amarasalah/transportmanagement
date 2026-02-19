/**
 * GPS Location Service
 * Sends driver's real-time GPS position to Firebase Realtime Database
 * Path: /gps_positions/{camionId}
 * Uses expo-location for foreground + background tracking
 */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { rtdb, dbRef, dbSet, db, doc, updateDoc } from './firebase';
import { COLLECTIONS } from '../constants/collections';
import { getDriverById } from './drivers';
import { getTruckById } from './trucks';

const BACKGROUND_LOCATION_TASK = 'fleettrack-background-location';
const UPDATE_INTERVAL_MS = 30_000; // 30 seconds

let foregroundSubscription: Location.LocationSubscription | null = null;
let fallbackInterval: ReturnType<typeof setInterval> | null = null;
let currentDriverId: string | null = null;
let currentCamionId: string | null = null;
let lastUpdateTime = 0;

/**
 * Request location permissions (foreground + background)
 */
export async function requestPermissions(): Promise<boolean> {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
        console.warn('📍 Foreground location permission denied');
        return false;
    }

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
        console.warn('📍 Background location permission denied (foreground only)');
        // Still usable in foreground-only mode
    }

    return true;
}

/**
 * Check if location permissions are granted
 */
export async function hasPermissions(): Promise<{ foreground: boolean; background: boolean }> {
    const fg = await Location.getForegroundPermissionsAsync();
    const bg = await Location.getBackgroundPermissionsAsync();
    return {
        foreground: fg.status === 'granted',
        background: bg.status === 'granted',
    };
}

/**
 * Get current position once
 */
export async function getCurrentPosition(): Promise<Location.LocationObject | null> {
    try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== 'granted') return null;

        return await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
        });
    } catch (err) {
        console.error('📍 getCurrentPosition error:', err);
        return null;
    }
}

/**
 * Send GPS coordinates to Firebase Realtime Database → /gps_positions/{camionId}
 * Also syncs to Firestore trucks/{camionId}.lastLocation as backup
 */
export async function sendLocationToFirestore(
    camionId: string,
    latitude: number,
    longitude: number,
    speed?: number | null,
    heading?: number | null,
): Promise<void> {
    const ts = new Date().toISOString();
    const locationData = {
        lat: latitude,
        lng: longitude,
        speed: speed ?? null,
        heading: heading ?? null,
        timestamp: ts,
        source: 'mobile_gps',
        driverId: currentDriverId || null,
    };

    // PRIMARY: Write to Realtime Database (instant, <100ms)
    try {
        const gpsRef = dbRef(rtdb, `gps_positions/${camionId}`);
        await dbSet(gpsRef, locationData);
        console.log(`📍 [RTDB] ${latitude.toFixed(5)}, ${longitude.toFixed(5)} → ${camionId}`);
    } catch (err: any) {
        console.error('📍 RTDB write error:', err?.message || err);
    }

    // SECONDARY: Also update Firestore (backup, for truck list display)
    try {
        await updateDoc(doc(db, COLLECTIONS.trucks, camionId), {
            lastLocation: locationData,
        });
    } catch (err: any) {
        console.warn('📍 Firestore backup write error:', err?.message || err);
    }
}

/**
 * Start foreground location tracking for a driver
 */
export async function startTracking(driverId: string, camionId: string): Promise<boolean> {
    const granted = await requestPermissions();
    if (!granted) return false;

    // Stop any existing tracking FIRST (this nullifies IDs)
    await stopTracking();

    // Set IDs AFTER stopTracking so they don't get nullified
    currentDriverId = driverId;
    currentCamionId = camionId;
    console.log(`📍 startTracking: driverId=${driverId}, camionId=${camionId}`);

    // Send initial position
    const loc = await getCurrentPosition();
    if (loc && currentCamionId) {
        await sendLocationToFirestore(
            currentCamionId,
            loc.coords.latitude,
            loc.coords.longitude,
            loc.coords.speed,
            loc.coords.heading,
        );
    }

    // Start foreground subscription (low distance threshold so it fires frequently)
    foregroundSubscription = await Location.watchPositionAsync(
        {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10, // meters — low threshold so updates fire even when nearly stationary
            timeInterval: UPDATE_INTERVAL_MS,
        },
        async (location: Location.LocationObject) => {
            const now = Date.now();
            // Throttle updates to avoid spamming Firestore
            if (now - lastUpdateTime < UPDATE_INTERVAL_MS) return;
            lastUpdateTime = now;

            if (currentCamionId) {
                console.log(`📍 Watch callback: ${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}`);
                await sendLocationToFirestore(
                    currentCamionId,
                    location.coords.latitude,
                    location.coords.longitude,
                    location.coords.speed,
                    location.coords.heading,
                );
            }
        },
    );

    // Fallback: guaranteed update every 30s even if device is stationary
    // (watchPositionAsync may not fire if distance threshold not met)
    if (fallbackInterval) clearInterval(fallbackInterval);
    fallbackInterval = setInterval(async () => {
        if (!currentCamionId) return;
        try {
            const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            if (pos && currentCamionId) {
                console.log(`📍 Fallback timer: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
                await sendLocationToFirestore(
                    currentCamionId,
                    pos.coords.latitude,
                    pos.coords.longitude,
                    pos.coords.speed,
                    pos.coords.heading,
                );
            }
        } catch (err) {
            console.warn('📍 Fallback timer error:', err);
        }
    }, UPDATE_INTERVAL_MS);

    // Try to start background tracking
    try {
        const perms = await hasPermissions();
        if (perms.background) {
            const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
            if (!isRegistered) {
                await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                    accuracy: Location.Accuracy.Balanced,
                    distanceInterval: 100,
                    timeInterval: 60_000, // 1 minute in background
                    deferredUpdatesInterval: 60_000,
                    showsBackgroundLocationIndicator: true,
                    foregroundService: {
                        notificationTitle: 'FleetTrack GPS',
                        notificationBody: 'Suivi GPS actif — position partagée',
                        notificationColor: '#8b5cf6',
                    },
                });
                console.log('📍 Background location tracking started');
            }
        }
    } catch (err) {
        console.warn('📍 Background tracking unavailable:', err);
    }

    return true;
}

/**
 * Stop all location tracking
 */
export async function stopTracking(): Promise<void> {
    if (foregroundSubscription) {
        foregroundSubscription.remove();
        foregroundSubscription = null;
    }
    if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = null;
    }

    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
        if (isRegistered) {
            await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
            console.log('📍 Background location tracking stopped');
        }
    } catch (err) {
        console.warn('📍 Error stopping background tracking:', err);
    }

    currentDriverId = null;
    currentCamionId = null;
    lastUpdateTime = 0;
}

/**
 * Check if tracking is currently active
 */
export function isTracking(): boolean {
    return foregroundSubscription !== null;
}

/**
 * Get the currently tracked camion ID
 */
export function getTrackedCamionId(): string | null {
    return currentCamionId;
}

// ==================== BACKGROUND TASK HANDLER ====================
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: { data: any; error: any }) => {
    if (error) {
        console.error('📍 Background location error:', error);
        return;
    }

    if (data && currentCamionId) {
        const { locations } = data as { locations: Location.LocationObject[] };
        const latest = locations[locations.length - 1];
        if (latest) {
            await sendLocationToFirestore(
                currentCamionId,
                latest.coords.latitude,
                latest.coords.longitude,
                latest.coords.speed,
                latest.coords.heading,
            );
        }
    }
});
