/**
 * Notification Context
 * Manages notification state (list, unread count, panel visibility)
 * Uses Alert.alert for in-app notifications (Expo Go compatible)
 * Listens to RTDB notifications/{driverId} for real-time trip alerts
 * Persists read state via AsyncStorage
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { rtdb, dbRef, onValue, dbPush, dbSet } from '../services/firebase';
import { useAuth } from './AuthContext';

export interface NotificationItem {
    id: string;
    type: string;
    planId?: string;
    destination?: string;
    date?: string;
    truck?: string;
    message?: string;
    timestamp: number;
}

interface NotificationContextType {
    notifications: NotificationItem[];
    unreadCount: number;
    showPanel: boolean;
    togglePanel: () => void;
    markAllRead: () => void;
    sendTest: () => void;
    debugInfo: string;
}

const STORAGE_KEY = '@notif_read_ids';

const NotificationContext = createContext<NotificationContextType>({
    notifications: [],
    unreadCount: 0,
    showPanel: false,
    togglePanel: () => { },
    markAllRead: () => { },
    sendTest: () => { },
    debugInfo: '',
});

export function useNotifications() {
    return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const [showPanel, setShowPanel] = useState(false);
    const [debugInfo, setDebugInfo] = useState('Initializing...');
    const shownAlertIds = useRef<Set<string>>(new Set());
    const initialLoadDone = useRef(false);

    // Load persisted read IDs
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then(val => {
            if (val) {
                try { setReadIds(new Set(JSON.parse(val))); } catch { }
            }
        });
    }, []);

    // Save read IDs when they change
    useEffect(() => {
        if (readIds.size > 0) {
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...readIds])).catch(() => { });
        }
    }, [readIds]);

    // Main effect: listen to RTDB
    useEffect(() => {
        console.log('=== [NotifContext] useEffect triggered ===');
        console.log('[NotifContext] user:', user ? `uid=${user.uid}` : 'null');
        console.log('[NotifContext] user.driverId:', user?.driverId);
        console.log('[NotifContext] rtdb:', rtdb ? 'initialized' : 'NULL');

        if (!user) {
            setDebugInfo('❌ No user logged in');
            return;
        }

        if (!user.driverId) {
            setDebugInfo(`⚠️ user.uid=${user.uid} but NO driverId`);
            console.log('[NotifContext] No driverId - trying direct RTDB test...');

            // Try a direct RTDB test to verify connectivity
            try {
                const testRef = dbRef(rtdb, '.info/connected');
                const unsub = onValue(testRef, (snap) => {
                    console.log('[NotifContext] RTDB connected:', snap.val());
                    setDebugInfo(prev => prev + `\nRTDB connected: ${snap.val()}`);
                }, (err) => {
                    console.error('[NotifContext] RTDB connection check error:', err);
                    setDebugInfo(prev => prev + `\nRTDB ERROR: ${err.message}`);
                });
                return () => unsub();
            } catch (e: any) {
                console.error('[NotifContext] RTDB test failed:', e);
                setDebugInfo(prev => prev + `\nRTDB test error: ${e.message}`);
            }
            return;
        }

        const driverId = user.driverId;
        const path = `notifications/${driverId}`;
        setDebugInfo(`🔔 Listening to: ${path}`);
        console.log(`[NotifContext] Setting up onValue for: ${path}`);
        initialLoadDone.current = false;

        try {
            const notifRef = dbRef(rtdb, path);
            console.log('[NotifContext] notifRef created:', notifRef.toString());

            const unsub = onValue(notifRef, (snapshot) => {
                console.log('[NotifContext] ✅ onValue callback fired!');
                const data = snapshot.val();
                console.log('[NotifContext] Data:', data ? JSON.stringify(Object.keys(data)) : 'null');

                if (!data) {
                    setNotifications([]);
                    setDebugInfo(`🔔 ${path}\n📭 Aucune donnée RTDB`);
                    initialLoadDone.current = true;
                    return;
                }

                const list: NotificationItem[] = Object.entries(data)
                    .map(([id, val]: [string, any]) => ({
                        id,
                        type: val.type || 'info',
                        planId: val.planId,
                        destination: val.destination,
                        date: val.date,
                        truck: val.truck,
                        message: val.message,
                        timestamp: val.timestamp || 0,
                    }))
                    .sort((a, b) => b.timestamp - a.timestamp);

                setDebugInfo(`🔔 ${path}\n📬 ${list.length} notification(s) trouvée(s)`);

                // Show Alert for NEW items (not on initial load)
                if (initialLoadDone.current) {
                    list.forEach(notif => {
                        if (!shownAlertIds.current.has(notif.id)) {
                            shownAlertIds.current.add(notif.id);
                            const title = notif.type === 'planifie'
                                ? '📅 Nouveau voyage planifié'
                                : notif.type === 'en_cours'
                                    ? '🚚 Voyage en cours !'
                                    : '🔔 Mise à jour';
                            Alert.alert(title, notif.message || 'Nouvelle notification');
                        }
                    });
                } else {
                    list.forEach(n => shownAlertIds.current.add(n.id));
                    initialLoadDone.current = true;
                    console.log('[NotifContext] Initial load done,', list.length, 'notifications');
                }

                setNotifications(list);
            }, (error) => {
                console.error('[NotifContext] ❌ onValue ERROR:', error.message);
                setDebugInfo(`❌ RTDB Error: ${error.message}`);
            });

            return () => {
                console.log('[NotifContext] Cleaning up listener');
                unsub();
            };
        } catch (e: any) {
            console.error('[NotifContext] Failed to set up listener:', e);
            setDebugInfo(`❌ Setup error: ${e.message}`);
        }
    }, [user?.uid, user?.driverId]);

    // Test function: push and immediately read
    const sendTest = useCallback(async () => {
        const driverId = user?.driverId;
        if (!driverId) {
            // Even without driverId, try pushing to a test path
            const testId = user?.uid || 'anonymous';
            Alert.alert('Debug Info',
                `user.uid: ${user?.uid}\n` +
                `user.driverId: ${user?.driverId}\n` +
                `user.role: ${user?.role}\n` +
                `user.camionId: ${user?.camionId}\n` +
                `RTDB: ${rtdb ? 'OK' : 'NULL'}\n` +
                `Trying push to notifications/${testId}...`
            );
            try {
                const ref = dbRef(rtdb, `notifications/${testId}`);
                await dbPush(ref, {
                    type: 'test',
                    message: `Test from uid ${testId}`,
                    timestamp: Date.now(),
                });
                Alert.alert('✅ Push OK', `Data pushed to notifications/${testId}`);
            } catch (e: any) {
                Alert.alert('❌ Push Failed', e.message);
            }
            return;
        }

        try {
            const notifRef = dbRef(rtdb, `notifications/${driverId}`);
            await dbPush(notifRef, {
                type: 'planifie',
                planId: 'test_' + Date.now(),
                destination: 'Tunis (Test)',
                date: new Date().toLocaleDateString('fr-FR'),
                truck: 'TEST-001',
                message: '🧪 Test notification',
                timestamp: Date.now(),
            });
            Alert.alert('✅ OK', `Pushed to notifications/${driverId}`);
        } catch (e: any) {
            Alert.alert('❌ Error', e.message);
        }
    }, [user]);

    const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

    const togglePanel = useCallback(() => {
        setShowPanel(prev => !prev);
    }, []);

    const markAllRead = useCallback(() => {
        setReadIds(new Set(notifications.map(n => n.id)));
    }, [notifications]);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, showPanel, togglePanel, markAllRead, sendTest, debugInfo }}>
            {children}
        </NotificationContext.Provider>
    );
}
