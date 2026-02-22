/**
 * NotificationBell - Bell icon with unread badge
 * Shows in tab header. Tap opens notification history panel.
 * Includes test button and debug info for troubleshooting.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, SafeAreaView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../constants/theme';
import { useNotifications, NotificationItem } from '../context/NotificationContext';

export default function NotificationBell() {
    const { notifications, unreadCount, showPanel, togglePanel, markAllRead, sendTest, debugInfo } = useNotifications();

    const formatTime = (ts: number) => {
        if (!ts) return '';
        const d = new Date(ts);
        const now = new Date();
        const diffMin = Math.round((now.getTime() - d.getTime()) / 60000);
        if (diffMin < 1) return "À l'instant";
        if (diffMin < 60) return `Il y a ${diffMin} min`;
        if (diffMin < 1440) return `Il y a ${Math.floor(diffMin / 60)}h`;
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'planifie': return { name: 'calendar-clock', color: '#60a5fa' };
            case 'en_cours': return { name: 'truck-delivery', color: '#f59e0b' };
            default: return { name: 'bell', color: '#8b5cf6' };
        }
    };

    const renderNotif = ({ item }: { item: NotificationItem }) => {
        const icon = getIcon(item.type);
        return (
            <View style={styles.notifItem}>
                <View style={[styles.notifIcon, { backgroundColor: `${icon.color}20` }]}>
                    <MaterialCommunityIcons name={icon.name as any} size={20} color={icon.color} />
                </View>
                <View style={styles.notifContent}>
                    <Text style={styles.notifMsg} numberOfLines={2}>{item.message || 'Notification'}</Text>
                    <View style={styles.notifMeta}>
                        {item.destination ? <Text style={styles.notifDest}>📍 {item.destination}</Text> : null}
                        <Text style={styles.notifTime}>{formatTime(item.timestamp)}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <>
            <TouchableOpacity onPress={togglePanel} style={styles.bellBtn}>
                <MaterialCommunityIcons name="bell-outline" size={24} color={Colors.text} />
                {unreadCount > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                )}
            </TouchableOpacity>

            <Modal visible={showPanel} animationType="slide" transparent={true} onRequestClose={togglePanel}>
                <SafeAreaView style={styles.modalOverlay}>
                    <View style={styles.panel}>
                        <View style={styles.panelHeader}>
                            <Text style={styles.panelTitle}>🔔 Notifications</Text>
                            <View style={styles.panelActions}>
                                {unreadCount > 0 && (
                                    <TouchableOpacity onPress={markAllRead} style={styles.markReadBtn}>
                                        <Text style={styles.markReadText}>Tout lire</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={togglePanel} style={styles.closeBtn}>
                                    <MaterialCommunityIcons name="close" size={22} color={Colors.text} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Debug info */}
                        <View style={styles.debugBox}>
                            <Text style={styles.debugText}>{debugInfo}</Text>
                            <TouchableOpacity onPress={sendTest} style={styles.testBtn}>
                                <MaterialCommunityIcons name="test-tube" size={14} color="#8b5cf6" />
                                <Text style={styles.testBtnText}>Test RTDB</Text>
                            </TouchableOpacity>
                        </View>

                        {notifications.length === 0 ? (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="bell-off-outline" size={48} color="#334155" />
                                <Text style={styles.emptyText}>Aucune notification</Text>
                                <Text style={styles.emptySub}>Les alertes de vos voyages apparaîtront ici</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={notifications}
                                keyExtractor={item => item.id}
                                renderItem={renderNotif}
                                contentContainerStyle={styles.notifList}
                                showsVerticalScrollIndicator={false}
                            />
                        )}
                    </View>
                </SafeAreaView>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    bellBtn: {
        padding: 8,
        marginRight: 8,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#ef4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: '#0f172a',
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    panel: {
        flex: 1,
        marginTop: 60,
        backgroundColor: '#0f172a',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    panelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(148,163,184,0.1)',
    },
    panelTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.text,
    },
    panelActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    markReadBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(139,92,246,0.15)',
        borderRadius: 12,
    },
    markReadText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#8b5cf6',
    },
    closeBtn: {
        padding: 4,
    },

    // Debug section
    debugBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        backgroundColor: 'rgba(30,41,59,0.5)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(148,163,184,0.05)',
    },
    debugText: {
        fontSize: 11,
        color: '#64748b',
        flex: 1,
    },
    testBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(139,92,246,0.1)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(139,92,246,0.3)',
    },
    testBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#8b5cf6',
    },

    // Notification items
    notifList: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    notifItem: {
        flexDirection: 'row',
        backgroundColor: 'rgba(30,41,59,0.8)',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        ...Shadows.small,
    },
    notifIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    notifContent: {
        flex: 1,
    },
    notifMsg: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        lineHeight: 20,
    },
    notifMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 8,
    },
    notifDest: {
        fontSize: 12,
        color: Colors.textMuted,
    },
    notifTime: {
        fontSize: 11,
        color: '#475569',
    },

    // Empty state
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 100,
    },
    emptyText: {
        fontSize: FontSize.lg,
        fontWeight: '700',
        color: '#475569',
        marginTop: Spacing.md,
    },
    emptySub: {
        fontSize: FontSize.sm,
        color: '#334155',
        marginTop: 4,
    },
});
