/**
 * Trucks Screen - Fleet Management
 * Driver role: only sees their assigned truck
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, RefreshControl,
    TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../src/constants/theme';
import { getTrucks, calculateTruckStats } from '../../src/services/trucks';
import { getEntries, getCachedEntries } from '../../src/services/entries';
import { useAuth } from '../../src/context/AuthContext';
import { Truck, TruckStats, Entry } from '../../src/types';

export default function TrucksScreen() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [entries, setEntries] = useState<Entry[]>([]);

    const loadData = useCallback(async () => {
        try {
            let [t, e] = await Promise.all([getTrucks(), getEntries()]);
            // Chauffeur data scope: show only their assigned truck
            if (user?.camionId) {
                t = t.filter(truck => truck.id === user.camionId);
            }
            setTrucks(t);
            setEntries(e);
        } catch (error) {
            console.error('Error loading trucks:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => { loadData(); }, [loadData]);

    const renderTruck = ({ item: truck }: { item: Truck }) => {
        const stats = calculateTruckStats(truck.id, entries);
        const perfColor = stats.performance >= 20 ? Colors.positive
            : stats.performance >= 10 ? Colors.info
                : stats.performance >= 0 ? Colors.warning
                    : Colors.negative;
        const resultColor = stats.resultat >= 0 ? Colors.positive : Colors.negative;

        return (
            <View style={styles.truckCard}>
                {/* Header */}
                <View style={styles.cardHeader}>
                    <View style={styles.truckInfo}>
                        <Text style={styles.truckIcon}>🚛</Text>
                        <View>
                            <Text style={styles.matricule}>{truck.matricule}</Text>
                            <Text style={styles.type}>{truck.type}</Text>
                        </View>
                    </View>
                    <View style={[styles.perfBadge, { backgroundColor: perfColor + '20' }]}>
                        <Text style={[styles.perfText, { color: perfColor }]}>
                            {stats.performance.toFixed(1)}%
                        </Text>
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>🛣️ Km</Text>
                        <Text style={styles.statValue}>{stats.totalKm.toLocaleString('fr-FR')}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>⛽ Gasoil</Text>
                        <Text style={styles.statValue}>{stats.totalGasoil.toLocaleString('fr-FR')} L</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>📊 Conso</Text>
                        <Text style={styles.statValue}>{stats.consommation.toFixed(1)} L/100</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>💵 Coût/Km</Text>
                        <Text style={styles.statValue}>{stats.coutParKm.toFixed(2)}</Text>
                    </View>
                </View>

                {/* Financial */}
                <View style={styles.financial}>
                    <View style={styles.finRow}>
                        <Text style={styles.finLabel}>📈 Revenus</Text>
                        <Text style={[styles.finValue, { color: Colors.positive }]}>
                            {stats.totalRevenue.toLocaleString('fr-FR')} TND
                        </Text>
                    </View>
                    <View style={styles.finRow}>
                        <Text style={styles.finLabel}>📉 Coûts</Text>
                        <Text style={[styles.finValue, { color: Colors.negative }]}>
                            {stats.totalCout.toLocaleString('fr-FR')} TND
                        </Text>
                    </View>
                    <View style={[styles.finRow, styles.finResult]}>
                        <Text style={styles.finResultLabel}>💰 Résultat</Text>
                        <Text style={[styles.finResultValue, { color: resultColor }]}>
                            {stats.resultat.toLocaleString('fr-FR')} TND
                        </Text>
                    </View>
                </View>

                {/* Performance Bar */}
                <View style={styles.perfBarContainer}>
                    <View style={styles.perfBarTrack}>
                        <View style={[styles.perfBarFill, { width: `${Math.max(0, Math.min(100, stats.performance + 50))}%`, backgroundColor: perfColor }]} />
                    </View>
                </View>

                {/* Cost Tags */}
                <View style={styles.costTags}>
                    <Text style={styles.costTag}>Fixes: {truck.chargesFixes}</Text>
                    <Text style={styles.costTag}>Ass: {truck.montantAssurance}</Text>
                    <Text style={styles.costTag}>Taxe: {truck.montantTaxe}</Text>
                    <Text style={styles.costTag}>Pers: {truck.chargePersonnel}</Text>
                </View>

                <Text style={styles.trajetCount}>📍 {stats.nbTrajets} trajet(s)</Text>
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
            <FlatList
                data={trucks}
                keyExtractor={item => item.id}
                renderItem={renderTruck}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.primary} />
                }
                ListHeaderComponent={
                    <View style={styles.hero}>
                        <Text style={styles.heroTitle}>🚛 Flotte</Text>
                        <Text style={styles.heroSubtitle}>{trucks.length} camion(s) enregistré(s)</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    center: { justifyContent: 'center', alignItems: 'center' },
    list: { padding: Spacing.md, paddingBottom: Spacing.xxl },

    hero: { marginBottom: Spacing.lg },
    heroTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
    heroSubtitle: { fontSize: FontSize.md, color: Colors.textSecondary },

    truckCard: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
        padding: Spacing.md, marginBottom: Spacing.md,
        borderWidth: 1, borderColor: Colors.cardBorder,
        ...Shadows.card,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    truckInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    truckIcon: { fontSize: 30 },
    matricule: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
    type: { fontSize: FontSize.xs, color: Colors.textMuted },
    perfBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
    perfText: { fontSize: FontSize.sm, fontWeight: '700' },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
    statBox: {
        flex: 1, minWidth: '22%', backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.sm, padding: Spacing.sm, alignItems: 'center',
    },
    statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 2 },
    statValue: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },

    financial: { marginBottom: Spacing.md },
    finRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    finLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
    finValue: { fontSize: FontSize.sm, fontWeight: '600' },
    finResult: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginTop: Spacing.xs },
    finResultLabel: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
    finResultValue: { fontSize: FontSize.md, fontWeight: '800' },

    perfBarContainer: { marginBottom: Spacing.sm },
    perfBarTrack: { height: 6, backgroundColor: Colors.surfaceLight, borderRadius: 3, overflow: 'hidden' },
    perfBarFill: { height: '100%', borderRadius: 3 },

    costTags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: Spacing.sm },
    costTag: { fontSize: FontSize.xs, color: Colors.textMuted, backgroundColor: Colors.surfaceLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.sm },
    trajetCount: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right' },
});
