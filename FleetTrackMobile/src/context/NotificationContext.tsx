/**
 * Notification Context
 * - Listens to RTDB notifications/{driverId} for real-time trip alerts
 * - Shows Alert.alert when app is open (Expo Go compatible, NO expo-notifications)
 * - All history visible in bell panel, read state persisted via AsyncStorage
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { rtdb, dbRef, onValue, dbPush } from '../services/firebase';
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
    debugInfo: 'Loading...',
});

export function useNotifications() {
    return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const [showPanel, setShowPanel] = useState(false);
    const [debugInfo, setDebugInfo] = useState('En attente...');
    const shownAlertIds = useRef<Set<string>>(new Set());
    const initialLoadDone = useRef(false);

    // Load persisted read IDs
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY).then(val => {
            if (val) { try { setReadIds(new Set(JSON.parse(val))); } catch { } }
        });
    }, []);

    // Save read IDs
    useEffect(() => {
        if (readIds.size > 0) {
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...readIds])).catch(() => { });
        }
    }, [readIds]);

    // RTDB listener for notifications
    useEffect(() => {
        console.log('[NotifCtx] useEffect: user=', user?.uid, 'driverId=', user?.driverId);

        if (!user) {
            setDebugInfo('Non connecté');
            return;
        }

        if (!user.driverId) {
            setDebugInfo(`UID: ${user.uid}\nPas de driverId`);
            return;
        }

        const driverId = user.driverId;
        const path = `notifications/${driverId}`;
        setDebugInfo(`Écoute: ${path}`);
        console.log(`[NotifCtx] Listening to RTDB: ${path}`);
        initialLoadDone.current = false;

        const notifRef = dbRef(rtdb, path);
        const unsub = onValue(notifRef, (snapshot) => {
            const data = snapshot.val();
            console.log('[NotifCtx] RTDB data:', data ? Object.keys(data).length + ' items' : 'null');

            if (!data) {
                setNotifications([]);
                setDebugInfo(`${path}\nAucune notification`);
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

            setDebugInfo(`${path}\n${list.length} notification(s)`);

            // Alert for NEW items only (not initial load)
            if (initialLoadDone.current) {
                list.forEach(notif => {
                    if (!shownAlertIds.current.has(notif.id)) {
                        shownAlertIds.current.add(notif.id);
                        const title = notif.type === 'planifie'
                            ? '📅 Nouveau voyage planifié'
                            : notif.type === 'en_cours'
                                ? '🚚 Voyage en cours !'
                                : '🔔 Mise à jour';
                        Alert.alert(title, notif.message || 'Notification');
                    }
                });
            } else {
                list.forEach(n => shownAlertIds.current.add(n.id));
                initialLoadDone.current = true;
                console.log('[NotifCtx] Initial load:', list.length, 'notifications');
            }

            setNotifications(list);
        }, (error) => {
            console.error('[NotifCtx] RTDB error:', error.message);
            setDebugInfo(`Erreur: ${error.message}`);
        });

        return () => unsub();
    }, [user?.driverId]);

    // Test push to RTDB
    const sendTest = useCallback(async () => {
        const targetId = user?.driverId || user?.uid;
        if (!targetId) {
            Alert.alert('Erreur', 'Non connecté');
            return;
        }
        try {
            const ref = dbRef(rtdb, `notifications/${targetId}`);
            await dbPush(ref, {
                type: 'planifie',
                planId: 'test_' + Date.now(),
                destination: 'Tunis (Test)',
                date: new Date().toLocaleDateString('fr-FR'),
                message: `🧪 Test → notifications/${targetId}`,
                timestamp: Date.now(),
            });
            Alert.alert('✅ Envoyé', `Push → notifications/${targetId}`);
        } catch (e: any) {
            Alert.alert('❌ Erreur', e.message);
        }
    }, [user]);

    const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;
    const togglePanel = useCallback(() => setShowPanel(prev => !prev), []);
    const markAllRead = useCallback(() => setReadIds(new Set(notifications.map(n => n.id))), [notifications]);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, showPanel, togglePanel, markAllRead, sendTest, debugInfo }}>
            {children}
        </NotificationContext.Provider>
    );
}
