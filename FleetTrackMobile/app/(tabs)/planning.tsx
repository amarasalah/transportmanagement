/**
 * Planning Screen - Planification des livraisons
 * Driver role: view planifications + confirm trip begin/end with photos
 * Admin role: full status control
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, RefreshControl,
    TouchableOpacity, ActivityIndicator, Alert, Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../src/constants/theme';
import { getPlanifications, updateStatus, deletePlanification, clearCache } from '../../src/services/planning';
import { getTrucks } from '../../src/services/trucks';
import { getDrivers } from '../../src/services/drivers';
import { getClients } from '../../src/services/clients';
import { useAuth } from '../../src/context/AuthContext';
import { Planification, Truck, Driver, Client } from '../../src/types';
import TripConfirmation from '../../src/components/TripConfirmation';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    planifie: { label: 'Planifié', color: Colors.info, icon: 'calendar-clock' },
    en_cours: { label: 'En cours', color: Colors.warning, icon: 'truck-delivery' },
    attente_confirmation: { label: 'En attente', color: '#f97316', icon: 'clock-check-outline' },
    termine: { label: 'Terminé', color: Colors.positive, icon: 'check-circle' },
    annule: { label: 'Annulé', color: Colors.negative, icon: 'close-circle' },
};

export default function PlanningScreen() {
    const { user } = useAuth();
    const isDriver = !!user?.driverId;
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [planifications, setPlanifications] = useState<Planification[]>([]);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [filter, setFilter] = useState<string>('all');

    // Trip confirmation modal state
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [confirmPlan, setConfirmPlan] = useState<Planification | null>(null);
    const [confirmMode, setConfirmMode] = useState<'begin' | 'end'>('begin');

    const loadData = useCallback(async () => {
        try {
            clearCache();
            let [p, t, d, c] = await Promise.all([
                getPlanifications(), getTrucks(), getDrivers(), getClients(),
            ]);
            if (user?.driverId) {
                p = p.filter(plan => plan.chauffeurId === user.driverId);
            }
            setPlanifications(p);
            setTrucks(t);
            setDrivers(d);
            setClients(c);
        } catch (error) {
            console.error('Error loading planning:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => { loadData(); }, [loadData]);

    const filtered = filter === 'all'
        ? planifications
        : planifications.filter(p => p.statut === filter);

    // Driver: open photo confirmation modal
    const openTripConfirm = (plan: Planification, mode: 'begin' | 'end') => {
        setConfirmPlan(plan);
        setConfirmMode(mode);
        setConfirmVisible(true);
    };

    // Admin: direct status change via alert
    const handleStatusChange = (plan: Planification) => {
        const options = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
            text: cfg.label,
            onPress: async () => {
                await updateStatus(plan.id, key as Planification['statut']);
                loadData();
            },
        }));
        options.push({ text: 'Annuler', onPress: async () => { } });
        Alert.alert('Changer statut', `Statut actuel: ${STATUS_CONFIG[plan.statut]?.label}`, options);
    };

    const handleDelete = (id: string) => {
        Alert.alert('Supprimer', 'Supprimer cette planification ?', [
            { text: 'Annuler', style: 'cancel' },
            {
                text: 'Supprimer', style: 'destructive', onPress: async () => {
                    await deletePlanification(id);
                    setPlanifications(prev => prev.filter(p => p.id !== id));
                }
            },
        ]);
    };

    const renderPlan = ({ item: plan }: { item: Planification }) => {
        const truck = trucks.find(t => t.id === plan.camionId);
        const driver = drivers.find(d => d.id === plan.chauffeurId);
        const client = plan.clientId ? clients.find(c => c.id === plan.clientId) : null;
        const status = STATUS_CONFIG[plan.statut] || STATUS_CONFIG.planifie;

        // Driver action button logic
        const canBegin = isDriver && plan.statut === 'planifie';
        const canEnd = isDriver && plan.statut === 'en_cours';
        const hasStartPhotos = !!plan.startPhotos;
        const hasEndPhotos = !!plan.endPhotos;

        return (
            <View style={[styles.planCard, { borderLeftColor: status.color }]}>
                {/* Header */}
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.dateText}>{formatDate(plan.date)}</Text>
                        {client && <Text style={styles.clientText}>👤 {client.nom}</Text>}
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}
                            onPress={() => !isDriver && handleStatusChange(plan)}
                        >
                            <MaterialCommunityIcons name={status.icon as any} size={14} color={status.color} />
                            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                        </TouchableOpacity>
                        {!isDriver && (
                            <TouchableOpacity onPress={() => handleDelete(plan.id)}>
                                <MaterialCommunityIcons name="delete-outline" size={18} color={Colors.textMuted} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Body */}
                <View style={styles.planBody}>
                    <Text style={styles.truckText}>🚛 {truck?.matricule || '-'}</Text>
                    <Text style={styles.driverSmall}>👤 {driver?.nom || '-'}</Text>
                    <Text style={styles.routeText}>
                        📍 {plan.origineDelegation || plan.origineGouvernorat || 'Départ'} → {plan.delegation || plan.gouvernorat || plan.destination || '-'}
                    </Text>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <Text style={styles.stat}>{plan.kilometrage || 0} km</Text>
                    <Text style={styles.stat}>⛽ {plan.quantiteGasoil || 0} L</Text>
                    <Text style={styles.stat}>💵 {(plan.prixLivraison || 0).toFixed(0)} TND</Text>
                </View>

                {/* Photo indicators */}
                {(hasStartPhotos || hasEndPhotos || plan.statut === 'attente_confirmation') && (
                    <View style={styles.photoIndicators}>
                        {hasStartPhotos && (
                            <View style={styles.photoTag}>
                                <MaterialCommunityIcons name="camera" size={12} color={Colors.positive} />
                                <Text style={styles.photoTagText}>Photos départ ✓</Text>
                            </View>
                        )}
                        {hasEndPhotos && (
                            <View style={styles.photoTag}>
                                <MaterialCommunityIcons name="camera" size={12} color={Colors.positive} />
                                <Text style={styles.photoTagText}>Photos arrivée ✓</Text>
                            </View>
                        )}
                        {plan.statut === 'attente_confirmation' && (
                            <View style={[styles.photoTag, { backgroundColor: 'rgba(249,115,22,0.15)' }]}>
                                <MaterialCommunityIcons name="clock-check-outline" size={12} color="#f97316" />
                                <Text style={[styles.photoTagText, { color: '#f97316' }]}>⏳ Attente confirmation admin</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* Driver Action Buttons */}
                {isDriver && (canBegin || canEnd) && (
                    <View style={styles.actionRow}>
                        {canBegin && (
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.actionBegin]}
                                onPress={() => openTripConfirm(plan, 'begin')}
                            >
                                <MaterialCommunityIcons name="truck-fast" size={18} color="#fff" />
                                <Text style={styles.actionBtnText}>🚛 Démarrer le voyage</Text>
                            </TouchableOpacity>
                        )}
                        {canEnd && (
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.actionEnd]}
                                onPress={() => openTripConfirm(plan, 'end')}
                            >
                                <MaterialCommunityIcons name="flag-checkered" size={18} color="#fff" />
                                <Text style={styles.actionBtnText}>🏁 Terminer le voyage</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Filter chips */}
            <View style={styles.filterBar}>
                <TouchableOpacity
                    style={[styles.filterChip, filter === 'all' && styles.filterActive]}
                    onPress={() => setFilter('all')}
                >
                    <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                        Tous ({planifications.length})
                    </Text>
                </TouchableOpacity>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                    const count = planifications.filter(p => p.statut === key).length;
                    return (
                        <TouchableOpacity
                            key={key}
                            style={[styles.filterChip, filter === key && { backgroundColor: cfg.color + '20', borderColor: cfg.color }]}
                            onPress={() => setFilter(key)}
                        >
                            <Text style={[styles.filterText, filter === key && { color: cfg.color }]}>
                                {cfg.label} ({count})
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                renderItem={renderPlan}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="calendar-blank" size={64} color={Colors.textMuted} />
                        <Text style={styles.emptyText}>Aucune planification</Text>
                    </View>
                }
            />

            {/* Trip Confirmation Modal */}
            <TripConfirmation
                visible={confirmVisible}
                plan={confirmPlan}
                mode={confirmMode}
                onClose={() => setConfirmVisible(false)}
                onConfirmed={() => {
                    setConfirmVisible(false);
                    loadData();
                }}
            />
        </View>
    );
}

function formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { justifyContent: 'center', alignItems: 'center' },
    list: { padding: Spacing.md, paddingBottom: Spacing.xxl },

    filterBar: {
        flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        gap: Spacing.xs, flexWrap: 'wrap',
    },
    filterChip: {
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full,
        borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
    },
    filterActive: { backgroundColor: Colors.primaryFaded, borderColor: Colors.primary },
    filterText: { fontSize: FontSize.xs, color: Colors.textSecondary },
    filterTextActive: { color: Colors.primary, fontWeight: '700' },

    planCard: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        padding: Spacing.md, marginBottom: Spacing.sm,
        borderLeftWidth: 3, ...Shadows.small,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    dateText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
    clientText: { fontSize: FontSize.xs, color: Colors.primary },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
    statusText: { fontSize: FontSize.xs, fontWeight: '600' },

    planBody: { marginBottom: Spacing.sm },
    truckText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
    driverSmall: { fontSize: FontSize.sm, color: Colors.textSecondary },
    routeText: { fontSize: FontSize.sm, color: Colors.textMuted },

    statsRow: { flexDirection: 'row', gap: Spacing.md },
    stat: { fontSize: FontSize.xs, color: Colors.textMuted, backgroundColor: Colors.surfaceLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.sm },

    // Photo indicators
    photoIndicators: {
        flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm,
    },
    photoTag: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: BorderRadius.full,
    },
    photoTagText: {
        fontSize: 10, color: Colors.positive, fontWeight: '600',
    },

    // Driver action buttons
    actionRow: {
        marginTop: Spacing.sm, gap: Spacing.xs,
    },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 12, borderRadius: BorderRadius.md,
    },
    actionBegin: {
        backgroundColor: Colors.warning,
    },
    actionEnd: {
        backgroundColor: Colors.positive,
    },
    actionBtnText: {
        color: '#fff', fontWeight: '700', fontSize: FontSize.sm,
    },

    emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl * 2 },
    emptyText: { color: Colors.textMuted, marginTop: Spacing.md, fontSize: FontSize.md },
});
