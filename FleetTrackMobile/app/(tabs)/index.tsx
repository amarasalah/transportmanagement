/**
 * Dashboard Screen
 * KPIs, mini chart, and recent entries
 * Driver role: scoped to their own data
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions,
    TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../src/constants/theme';
import { getTrucks, calculateEntryCosts, getCachedTrucks } from '../../src/services/trucks';
import { getEntries, getCachedEntries } from '../../src/services/entries';
import { getDrivers } from '../../src/services/drivers';
import { useAuth } from '../../src/context/AuthContext';
import { Entry, Truck, DashboardKPIs } from '../../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DashboardScreen() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [kpis, setKpis] = useState<DashboardKPIs>({
        activeTrucks: 0, totalKm: 0, totalGasoil: 0,
        totalResult: 0, totalRevenue: 0, totalCost: 0,
    });
    const [recentEntries, setRecentEntries] = useState<Entry[]>([]);
    const [trucks, setTrucks] = useState<Truck[]>([]);

    const loadData = useCallback(async () => {
        try {
            const [trucksData, allEntries] = await Promise.all([
                getTrucks(),
                getEntries(),
            ]);
            await getDrivers();
            setTrucks(trucksData);

            // Chauffeur data scope: filter entries by driverId
            let entriesData = allEntries;
            if (user?.driverId) {
                entriesData = allEntries.filter(e => e.chauffeurId === user.driverId);
            }

            // Calculate KPIs
            const today = new Date().toISOString().split('T')[0];
            const todayEntries = entriesData.filter(e => e.date === today);
            const activeTrucks = new Set(todayEntries.map(e => e.camionId)).size;

            let totalKm = 0, totalGasoil = 0, totalCost = 0, totalRevenue = 0;
            entriesData.forEach(entry => {
                totalKm += entry.kilometrage || 0;
                totalGasoil += entry.quantiteGasoil || 0;
                totalRevenue += entry.prixLivraison || 0;
                const truck = trucksData.find(t => t.id === entry.camionId);
                const costs = calculateEntryCosts(entry, truck);
                totalCost += costs.coutTotal;
            });

            setKpis({
                activeTrucks: activeTrucks || (user?.driverId ? 1 : trucksData.length),
                totalKm, totalGasoil,
                totalResult: totalRevenue - totalCost,
                totalRevenue, totalCost,
            });

            // Recent entries (last 5)
            const sorted = [...entriesData].sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            setRecentEntries(sorted.slice(0, 5));
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => { loadData(); }, [loadData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, [loadData]);

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Chargement des données...</Text>
            </View>
        );
    }

    const kpiCards = [
        { icon: 'truck', label: 'Camions', value: `${kpis.activeTrucks}`, color: Colors.primary, bg: Colors.primaryFaded },
        { icon: 'road-variant', label: 'Km Total', value: `${kpis.totalKm.toLocaleString('fr-FR')}`, color: Colors.info, bg: Colors.infoFaded },
        { icon: 'gas-station', label: 'Gasoil (L)', value: `${kpis.totalGasoil.toLocaleString('fr-FR')}`, color: Colors.warning, bg: Colors.warningFaded },
        { icon: 'cash-multiple', label: 'Résultat', value: `${kpis.totalResult.toLocaleString('fr-FR')} TND`, color: kpis.totalResult >= 0 ? Colors.positive : Colors.negative, bg: kpis.totalResult >= 0 ? Colors.positiveFaded : Colors.negativeFaded },
    ];

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
            {/* KPI Cards */}
            <View style={styles.kpiGrid}>
                {kpiCards.map((kpi, i) => (
                    <View key={i} style={[styles.kpiCard, { borderLeftColor: kpi.color }]}>
                        <View style={[styles.kpiIconWrap, { backgroundColor: kpi.bg }]}>
                            <MaterialCommunityIcons name={kpi.icon as any} size={22} color={kpi.color} />
                        </View>
                        <Text style={styles.kpiLabel}>{kpi.label}</Text>
                        <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
                    </View>
                ))}
            </View>

            {/* Financial Summary */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>💰 Résumé Financier</Text>
                <View style={styles.financialCard}>
                    <View style={styles.finRow}>
                        <Text style={styles.finLabel}>📈 Revenus</Text>
                        <Text style={[styles.finValue, { color: Colors.positive }]}>
                            {kpis.totalRevenue.toLocaleString('fr-FR')} TND
                        </Text>
                    </View>
                    <View style={styles.finRow}>
                        <Text style={styles.finLabel}>📉 Coûts</Text>
                        <Text style={[styles.finValue, { color: Colors.negative }]}>
                            {kpis.totalCost.toLocaleString('fr-FR')} TND
                        </Text>
                    </View>
                    <View style={[styles.finRow, styles.finTotal]}>
                        <Text style={styles.finTotalLabel}>💰 Résultat Net</Text>
                        <Text style={[styles.finTotalValue, { color: kpis.totalResult >= 0 ? Colors.positive : Colors.negative }]}>
                            {kpis.totalResult.toLocaleString('fr-FR')} TND
                        </Text>
                    </View>
                </View>
            </View>

            {/* Recent Entries */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📋 Dernières Saisies</Text>
                {recentEntries.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="clipboard-text-off" size={48} color={Colors.textMuted} />
                        <Text style={styles.emptyText}>Aucune saisie</Text>
                    </View>
                ) : (
                    recentEntries.map((entry, i) => {
                        const truck = trucks.find(t => t.id === entry.camionId);
                        const costs = calculateEntryCosts(entry, truck);
                        return (
                            <View key={entry.id} style={styles.entryCard}>
                                <View style={styles.entryHeader}>
                                    <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
                                    <Text style={[
                                        styles.entryResult,
                                        { color: costs.resultat >= 0 ? Colors.positive : Colors.negative }
                                    ]}>
                                        {costs.resultat >= 0 ? '+' : ''}{costs.resultat.toFixed(0)} TND
                                    </Text>
                                </View>
                                <View style={styles.entryBody}>
                                    <Text style={styles.entryTruck}>🚛 {truck?.matricule || '-'}</Text>
                                    <Text style={styles.entryRoute}>
                                        {entry.origineDelegation || entry.origineGouvernorat || 'Gabès'} → {entry.delegation || entry.gouvernorat || entry.destination || '-'}
                                    </Text>
                                </View>
                                <View style={styles.entryStats}>
                                    <Text style={styles.entryStat}>{entry.kilometrage || 0} km</Text>
                                    <Text style={styles.entryStat}>⛽ {entry.quantiteGasoil || 0} L</Text>
                                    <Text style={styles.entryStat}>💵 {(entry.prixLivraison || 0).toFixed(0)} TND</Text>
                                </View>
                            </View>
                        );
                    })
                )}
            </View>
        </ScrollView>
    );
}

function formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
    center: { justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: Colors.textSecondary, marginTop: Spacing.md, fontSize: FontSize.md },

    // KPI Grid
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
    kpiCard: {
        width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.sm) / 2 - 1,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderLeftWidth: 3,
        ...Shadows.card,
    },
    kpiIconWrap: {
        width: 40, height: 40, borderRadius: BorderRadius.sm,
        justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm,
    },
    kpiLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 2 },
    kpiValue: { fontSize: FontSize.lg, fontWeight: '700' },

    // Sections
    section: { marginBottom: Spacing.lg },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },

    // Financial
    financialCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, ...Shadows.card },
    finRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
    finLabel: { fontSize: FontSize.md, color: Colors.textSecondary },
    finValue: { fontSize: FontSize.md, fontWeight: '600' },
    finTotal: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: Spacing.sm, paddingTop: Spacing.md },
    finTotalLabel: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
    finTotalValue: { fontSize: FontSize.xl, fontWeight: '800' },

    // Entries
    entryCard: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        padding: Spacing.md, marginBottom: Spacing.sm,
        borderLeftWidth: 2, borderLeftColor: Colors.primary,
        ...Shadows.small,
    },
    entryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
    entryDate: { fontSize: FontSize.sm, color: Colors.textSecondary },
    entryResult: { fontSize: FontSize.md, fontWeight: '700' },
    entryBody: { marginBottom: Spacing.xs },
    entryTruck: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
    entryRoute: { fontSize: FontSize.sm, color: Colors.textSecondary },
    entryStats: { flexDirection: 'row', gap: Spacing.md },
    entryStat: { fontSize: FontSize.xs, color: Colors.textMuted, backgroundColor: Colors.surfaceLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.sm },

    // Empty
    emptyState: { alignItems: 'center', padding: Spacing.xl },
    emptyText: { color: Colors.textMuted, marginTop: Spacing.sm, fontSize: FontSize.md },
});
