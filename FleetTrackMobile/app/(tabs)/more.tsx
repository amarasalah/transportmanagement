/**
 * More Screen - Settings, Drivers, Clients, Purchases
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../src/constants/theme';
import { getDrivers } from '../../src/services/drivers';
import { getClients } from '../../src/services/clients';
import { getOrders } from '../../src/services/purchases';
import { getTrucks, getCachedTrucks } from '../../src/services/trucks';
import { Driver, Client, PurchaseOrder, Truck } from '../../src/types';

export default function MoreScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [activeSection, setActiveSection] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            const [d, c, o, t] = await Promise.all([
                getDrivers(), getClients(), getOrders(), getTrucks(),
            ]);
            setDrivers(d);
            setClients(c);
            setOrders(o);
            setTrucks(t);
        } catch (error) {
            console.error('Error loading more data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.primary} />}
        >
            {/* Drivers Section */}
            <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setActiveSection(activeSection === 'drivers' ? null : 'drivers')}
            >
                <View style={styles.sectionLeft}>
                    <View style={[styles.sectionIcon, { backgroundColor: Colors.infoFaded }]}>
                        <MaterialCommunityIcons name="account-group" size={22} color={Colors.info} />
                    </View>
                    <View>
                        <Text style={styles.sectionTitle}>👤 Chauffeurs</Text>
                        <Text style={styles.sectionCount}>{drivers.length} enregistré(s)</Text>
                    </View>
                </View>
                <MaterialCommunityIcons
                    name={activeSection === 'drivers' ? 'chevron-up' : 'chevron-down'}
                    size={24} color={Colors.textMuted}
                />
            </TouchableOpacity>
            {activeSection === 'drivers' && (
                <View style={styles.sectionContent}>
                    {drivers.map(d => {
                        const truck = d.camionId ? trucks.find(t => t.id === d.camionId) : null;
                        return (
                            <View key={d.id} style={styles.itemCard}>
                                <Text style={styles.itemName}>{d.nom}</Text>
                                <Text style={styles.itemSub}>
                                    🚛 {truck?.matricule || 'Non assigné'} {d.telephone ? `• 📞 ${d.telephone}` : ''}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Clients Section */}
            <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setActiveSection(activeSection === 'clients' ? null : 'clients')}
            >
                <View style={styles.sectionLeft}>
                    <View style={[styles.sectionIcon, { backgroundColor: Colors.positiveFaded }]}>
                        <MaterialCommunityIcons name="account-tie" size={22} color={Colors.positive} />
                    </View>
                    <View>
                        <Text style={styles.sectionTitle}>👥 Clients</Text>
                        <Text style={styles.sectionCount}>{clients.length} client(s)</Text>
                    </View>
                </View>
                <MaterialCommunityIcons
                    name={activeSection === 'clients' ? 'chevron-up' : 'chevron-down'}
                    size={24} color={Colors.textMuted}
                />
            </TouchableOpacity>
            {activeSection === 'clients' && (
                <View style={styles.sectionContent}>
                    {clients.map(c => (
                        <View key={c.id} style={styles.itemCard}>
                            <View style={styles.itemHeader}>
                                <Text style={styles.itemName}>{c.nom}</Text>
                                <Text style={[styles.itemSolde, { color: (c.solde || 0) >= 0 ? Colors.positive : Colors.negative }]}>
                                    {(c.solde || 0).toLocaleString('fr-FR')} TND
                                </Text>
                            </View>
                            <Text style={styles.itemSub}>
                                {c.code} {c.telephone ? `• 📞 ${c.telephone}` : ''} {c.adresse ? `• 📍 ${c.adresse}` : ''}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Purchase Orders Section */}
            <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setActiveSection(activeSection === 'orders' ? null : 'orders')}
            >
                <View style={styles.sectionLeft}>
                    <View style={[styles.sectionIcon, { backgroundColor: Colors.warningFaded }]}>
                        <MaterialCommunityIcons name="clipboard-list" size={22} color={Colors.warning} />
                    </View>
                    <View>
                        <Text style={styles.sectionTitle}>📋 Bons de Commande</Text>
                        <Text style={styles.sectionCount}>{orders.length} BC</Text>
                    </View>
                </View>
                <MaterialCommunityIcons
                    name={activeSection === 'orders' ? 'chevron-up' : 'chevron-down'}
                    size={24} color={Colors.textMuted}
                />
            </TouchableOpacity>
            {activeSection === 'orders' && (
                <View style={styles.sectionContent}>
                    {orders.map(o => {
                        const truck = o.camionId ? trucks.find(t => t.id === o.camionId) : null;
                        const statusColor = o.statut === 'Validé' ? Colors.positive : o.statut === 'En cours' ? Colors.warning : Colors.textMuted;
                        return (
                            <View key={o.id} style={styles.itemCard}>
                                <View style={styles.itemHeader}>
                                    <Text style={styles.itemName}>#{o.numero}</Text>
                                    <View style={[styles.statusDot, { backgroundColor: statusColor + '20' }]}>
                                        <Text style={[styles.statusDotText, { color: statusColor }]}>{o.statut}</Text>
                                    </View>
                                </View>
                                <Text style={styles.itemSub}>
                                    {formatDate(o.date)} {truck ? `• 🚛 ${truck.matricule}` : ''}
                                </Text>
                                <Text style={styles.itemTotal}>
                                    💰 {(o.totalTTC || 0).toLocaleString('fr-FR')} TND TTC
                                </Text>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* App Info */}
            <View style={styles.appInfo}>
                <Text style={styles.appName}>🚛 FleetTrack Mobile</Text>
                <Text style={styles.appVersion}>v1.0.0 • Firebase: managementsirep</Text>
                <Text style={styles.appDesc}>Connecté au même backend que l'app web</Text>
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
    content: { paddingBottom: Spacing.xxl },
    center: { justifyContent: 'center', alignItems: 'center' },

    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: Spacing.md, backgroundColor: Colors.surface,
        borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    sectionIcon: { width: 44, height: 44, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center' },
    sectionTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
    sectionCount: { fontSize: FontSize.xs, color: Colors.textMuted },

    sectionContent: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.background },

    itemCard: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.small,
    },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
    itemSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
    itemSolde: { fontSize: FontSize.sm, fontWeight: '700' },
    itemTotal: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary, marginTop: 4 },
    statusDot: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
    statusDotText: { fontSize: FontSize.xs, fontWeight: '600' },

    appInfo: { alignItems: 'center', padding: Spacing.xl, marginTop: Spacing.lg },
    appName: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
    appVersion: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: Spacing.xs },
    appDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
});
