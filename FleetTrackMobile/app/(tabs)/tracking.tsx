/**
 * GPS Tracking Screen
 * Drivers: toggle GPS sharing for their assigned truck
 * Admins: view all truck locations
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert, Switch, Platform,
    SafeAreaView, StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { getTrucks, getCachedTrucks } from '../../src/services/trucks';
import { getDrivers, getDriverById } from '../../src/services/drivers';
import {
    requestPermissions,
    hasPermissions,
    startTracking,
    stopTracking,
    isTracking,
    getCurrentPosition,
    getTrackedCamionId,
} from '../../src/services/location';
import { Truck, Driver } from '../../src/types';

interface TruckLocationItem {
    truck: Truck;
    driver?: Driver;
    hasLocation: boolean;
    lastUpdate: string;
}

export default function TrackingScreen() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tracking, setTracking] = useState(false);
    const [truckLocations, setTruckLocations] = useState<TruckLocationItem[]>([]);
    const [myTruck, setMyTruck] = useState<Truck | null>(null);
    const [myDriver, setMyDriver] = useState<Driver | null>(null);
    const [permGranted, setPermGranted] = useState(false);
    const [lastPos, setLastPos] = useState<{ lat: number; lng: number } | null>(null);

    const isDriver = !!user?.driverId;
    const isAdmin = user?.role === 'super_admin' || user?.roleId === 'super_admin';

    const loadData = useCallback(async () => {
        try {
            const [trucks, drivers] = await Promise.all([getTrucks(), getDrivers()]);

            // Build truck location list
            const locations: TruckLocationItem[] = trucks.map(t => {
                const driver = drivers.find(d => d.camionId === t.id);
                const loc = t.lastLocation;
                return {
                    truck: t,
                    driver,
                    hasLocation: !!loc?.lat,
                    lastUpdate: loc?.timestamp
                        ? new Date(loc.timestamp).toLocaleString('fr-FR')
                        : 'Jamais',
                };
            });

            // Sort: located first, then by matricule
            locations.sort((a, b) => {
                if (a.hasLocation && !b.hasLocation) return -1;
                if (!a.hasLocation && b.hasLocation) return 1;
                return a.truck.matricule.localeCompare(b.truck.matricule);
            });

            setTruckLocations(locations);

            // Driver-specific: find my truck
            if (user?.driverId) {
                const driver = drivers.find(d => d.id === user.driverId);
                setMyDriver(driver || null);
                if (driver?.camionId) {
                    const truck = trucks.find(t => t.id === driver.camionId);
                    setMyTruck(truck || null);
                }
            }

            // Check permissions
            const perms = await hasPermissions();
            setPermGranted(perms.foreground);

            // Check if already tracking
            setTracking(isTracking());

        } catch (error) {
            console.error('Error loading tracking data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => { loadData(); }, [loadData]);

    // Auto-refresh every 30s
    useEffect(() => {
        const interval = setInterval(() => {
            if (!loading) loadData();
        }, 30000);
        return () => clearInterval(interval);
    }, [loading, loadData]);

    const handleToggleTracking = async () => {
        if (tracking) {
            await stopTracking();
            setTracking(false);
            Alert.alert('📍 GPS Désactivé', 'Le partage de position est arrêté.');
        } else {
            if (!myDriver?.camionId) {
                Alert.alert('⚠️ Erreur', 'Aucun camion assigné à votre profil chauffeur.');
                return;
            }

            const granted = await requestPermissions();
            if (!granted) {
                Alert.alert(
                    '⚠️ Permission requise',
                    'Veuillez autoriser l\'accès à la localisation dans les paramètres de votre téléphone.',
                );
                return;
            }
            setPermGranted(true);

            const started = await startTracking(user!.driverId!, myDriver.camionId);
            if (started) {
                setTracking(true);
                // Get initial position for display
                const pos = await getCurrentPosition();
                if (pos) {
                    setLastPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                }
                Alert.alert('📍 GPS Activé', 'Votre position est partagée en temps réel.');
            }
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    const locatedCount = truckLocations.filter(t => t.hasLocation).length;
    const totalCount = truckLocations.length;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); loadData(); }}
                        tintColor={Colors.primary}
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>📍 Suivi GPS</Text>
                    <Text style={styles.headerSubtitle}>
                        {locatedCount}/{totalCount} camions localisés
                    </Text>
                </View>

                {/* Driver GPS Toggle */}
                {isDriver && (
                    <View style={styles.driverCard}>
                        <View style={styles.driverCardHeader}>
                            <View style={styles.driverCardLeft}>
                                <View style={[styles.statusDot, { backgroundColor: tracking ? '#10b981' : '#64748b' }]} />
                                <View>
                                    <Text style={styles.driverCardTitle}>
                                        {tracking ? '🟢 GPS Actif' : '⚪ GPS Inactif'}
                                    </Text>
                                    <Text style={styles.driverCardSub}>
                                        {myTruck ? `🚛 ${myTruck.matricule}` : 'Aucun camion assigné'}
                                        {myDriver ? ` · ${myDriver.nom}` : ''}
                                    </Text>
                                </View>
                            </View>
                            <Switch
                                value={tracking}
                                onValueChange={handleToggleTracking}
                                trackColor={{ false: '#334155', true: 'rgba(16,185,129,0.3)' }}
                                thumbColor={tracking ? '#10b981' : '#94a3b8'}
                            />
                        </View>

                        {tracking && lastPos && (
                            <View style={styles.positionInfo}>
                                <MaterialCommunityIcons name="crosshairs-gps" size={16} color="#10b981" />
                                <Text style={styles.positionText}>
                                    {lastPos.lat.toFixed(5)}, {lastPos.lng.toFixed(5)}
                                </Text>
                            </View>
                        )}

                        {!permGranted && (
                            <TouchableOpacity style={styles.permBtn} onPress={requestPermissions}>
                                <MaterialCommunityIcons name="shield-alert" size={16} color="#f59e0b" />
                                <Text style={styles.permBtnText}>Autoriser la localisation</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Stats Bar */}
                <View style={styles.statsBar}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{totalCount}</Text>
                        <Text style={styles.statLabel}>Camions</Text>
                    </View>
                    <View style={[styles.statItem, styles.statPositive]}>
                        <Text style={[styles.statValue, { color: '#10b981' }]}>{locatedCount}</Text>
                        <Text style={styles.statLabel}>Localisés</Text>
                    </View>
                    <View style={[styles.statItem, styles.statNegative]}>
                        <Text style={[styles.statValue, { color: '#ef4444' }]}>{totalCount - locatedCount}</Text>
                        <Text style={styles.statLabel}>Non localisés</Text>
                    </View>
                </View>

                {/* Truck Locations List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Positions des Camions</Text>
                    {truckLocations.map(item => {
                        const loc = item.truck.lastLocation;
                        const typeColor = item.truck.type === 'BENNE' ? '#f59e0b'
                            : item.truck.type === 'CITERNE' ? '#10b981' : '#3b82f6';

                        return (
                            <View key={item.truck.id} style={[
                                styles.truckCard,
                                !item.hasLocation && styles.truckCardInactive,
                            ]}>
                                <View style={styles.truckCardLeft}>
                                    <View style={[styles.truckIcon, { backgroundColor: typeColor + '20', borderColor: typeColor + '40' }]}>
                                        <Text style={{ fontSize: 22 }}>🚛</Text>
                                    </View>
                                    <View style={styles.truckInfo}>
                                        <Text style={styles.truckMatricule}>{item.truck.matricule}</Text>
                                        <Text style={styles.truckMeta}>
                                            <Text style={{ color: typeColor, fontWeight: '700' }}>{item.truck.type}</Text>
                                            {' · '}{item.driver?.nom || 'Non assigné'}
                                        </Text>
                                        {item.hasLocation && loc && (
                                            <Text style={styles.truckPos}>
                                                📍 {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                                            </Text>
                                        )}
                                        <Text style={styles.truckUpdate}>
                                            {item.hasLocation ? `⏱ ${item.lastUpdate}` : '❓ Position non définie'}
                                            {loc?.source === 'mobile_gps' && ' · 📱 GPS Mobile'}
                                            {loc?.source === 'gps' && ' · 🌐 GPS Web'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={[
                                    styles.locBadge,
                                    { backgroundColor: item.hasLocation ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' },
                                ]}>
                                    <MaterialCommunityIcons
                                        name={item.hasLocation ? 'map-marker-check' : 'map-marker-off'}
                                        size={18}
                                        color={item.hasLocation ? '#10b981' : '#ef4444'}
                                    />
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Info footer */}
                <View style={styles.footer}>
                    <MaterialCommunityIcons name="information-outline" size={14} color="#64748b" />
                    <Text style={styles.footerText}>
                        Les positions sont mises à jour toutes les 30 secondes.
                        Ouvrez le panneau Admin sur l'app web pour voir la carte.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { paddingBottom: Spacing.xxl },
    center: { justifyContent: 'center', alignItems: 'center' },

    header: { padding: Spacing.lg, paddingBottom: Spacing.sm },
    headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.text },
    headerSubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4 },

    // Driver GPS card
    driverCard: {
        margin: Spacing.md,
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    driverCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    driverCardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    statusDot: { width: 12, height: 12, borderRadius: 6 },
    driverCardTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
    driverCardSub: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },
    positionInfo: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginTop: Spacing.sm, paddingTop: Spacing.sm,
        borderTopWidth: 1, borderTopColor: 'rgba(148,163,184,0.1)',
    },
    positionText: { fontSize: FontSize.sm, color: '#10b981', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    permBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginTop: Spacing.sm, padding: Spacing.sm,
        backgroundColor: 'rgba(245,158,11,0.1)',
        borderRadius: BorderRadius.sm,
        borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    },
    permBtnText: { fontSize: FontSize.sm, color: '#f59e0b', fontWeight: '600' },

    // Stats bar
    statsBar: {
        flexDirection: 'row', marginHorizontal: Spacing.md, marginVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    statItem: {
        flex: 1, backgroundColor: 'rgba(30,41,59,0.6)',
        borderRadius: BorderRadius.md, padding: Spacing.md,
        alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(148,163,184,0.1)',
    },
    statPositive: { borderColor: 'rgba(16,185,129,0.2)' },
    statNegative: { borderColor: 'rgba(239,68,68,0.2)' },
    statValue: { fontSize: 22, fontWeight: '800', color: Colors.text },
    statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },

    // Section
    section: { marginTop: Spacing.md, paddingHorizontal: Spacing.md },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },

    // Truck cards
    truckCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        padding: Spacing.md, marginBottom: Spacing.sm,
        ...Shadows.small,
    },
    truckCardInactive: { opacity: 0.6 },
    truckCardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
    truckIcon: {
        width: 46, height: 46, borderRadius: 23,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2,
    },
    truckInfo: { flex: 1 },
    truckMatricule: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
    truckMeta: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 1 },
    truckPos: { fontSize: FontSize.xs, color: '#10b981', marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    truckUpdate: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
    locBadge: {
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center',
        marginLeft: Spacing.sm,
    },

    // Footer
    footer: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 6,
        margin: Spacing.md, padding: Spacing.md,
        backgroundColor: 'rgba(30,41,59,0.4)',
        borderRadius: BorderRadius.md,
    },
    footerText: { fontSize: FontSize.xs, color: '#64748b', flex: 1, lineHeight: 18 },
});
