/**
 * Push Notifications Service
 * - Registers device for FCM and saves token to Firestore users/{uid}
 * - Configures notification handler for foreground display
 * - Works with expo-notifications + development build (NOT Expo Go for background)
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS } from '@/constants/collections';

// Display notifications even when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Request notification permissions and register FCM token.
 * Saves the token to Firestore users/{uid}.fcmToken so the web can send targeted pushes.
 */
export async function registerForPushNotifications(uid: string): Promise<string | null> {
    try {
        // Request permission
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('[Push] Permission not granted');
            return null;
        }

        // Android: create default notification channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'FleetTrack Alerts',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#8b5cf6',
                sound: 'default',
            });
        }

        // Get Expo push token (works for Expo Go testing)
        const expoPushToken = await Notifications.getExpoPushTokenAsync({
            projectId: 'eec0a937-4d2e-42a2-a271-ede5a9c0b067',
        });

        const token = expoPushToken.data;
        console.log('[Push] Expo push token:', token);

        // Save token to Firestore
        await updateDoc(doc(db, COLLECTIONS.users, uid), {
            expoPushToken: token,
            fcmTokenUpdatedAt: new Date().toISOString(),
        });

        console.log('[Push] Token saved to Firestore for user:', uid);
        return token;
    } catch (error: any) {
        console.warn('[Push] Token registration failed:', error.message);
        return null;
    }
}
