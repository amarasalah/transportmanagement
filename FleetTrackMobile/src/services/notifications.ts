/**
 * Notifications Service for Drivers
 * Listens to RTDB `notifications/{driverId}` for trip events
 * Shows in-app alerts when trips are planned or started
 */
import { Alert } from 'react-native';
import { rtdb, dbRef, onValue } from './firebase';

let notifListener: (() => void) | null = null;
let lastSeen = Date.now();

/**
 * Start listening for driver notifications
 */
export function startNotificationListener(driverId: string) {
    stopNotificationListener();
    lastSeen = Date.now();
    console.log('[Notifications] Starting listener for driver:', driverId);

    const notifRef = dbRef(rtdb, `notifications/${driverId}`);

    // Use onValue to listen to the whole node, then track what we've shown
    const shownIds = new Set<string>();

    notifListener = onValue(notifRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            console.log('[Notifications] No notifications yet');
            return;
        }

        Object.entries(data).forEach(([id, val]: [string, any]) => {
            // Skip already-shown and old notifications
            if (shownIds.has(id)) return;
            shownIds.add(id);

            if (!val || !val.timestamp) return;
            if (val.timestamp < lastSeen) return;

            console.log('[Notifications] New notification:', val.type, val.message);

            const title = val.type === 'planifie'
                ? '📅 Nouveau voyage planifié'
                : val.type === 'en_cours'
                    ? '🚚 Voyage en cours !'
                    : '🔔 Notification';

            const body = [
                val.destination ? `📍 ${val.destination}` : '',
                val.date ? `📅 ${val.date}` : '',
                val.truck ? `🚛 ${val.truck}` : '',
                val.message || '',
            ].filter(Boolean).join('\n');

            Alert.alert(title, body);
        });
    });
}

/**
 * Stop listening
 */
export function stopNotificationListener() {
    if (notifListener) {
        notifListener();
        notifListener = null;
    }
}
