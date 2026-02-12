/**
 * Entries Screen - Saisies Journalières
 * List, create, edit daily entries
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, RefreshControl,
    TouchableOpacity, Alert, ActivityIndicator, TextInput, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from '../../src/constants/theme';
import { getEntries, getEntriesByDate, saveEntry, deleteEntry, getCachedEntries } from '../../src/services/entries';
import { getTrucks, calculateEntryCosts, getCachedTrucks } from '../../src/services/trucks';
import { getDrivers, getCachedDrivers } from '../../src/services/drivers';
import { Entry, Truck, Driver } from '../../src/types';

export default function EntriesScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showForm, setShowForm] = useState(false);
    const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

    const loadData = useCallback(async () => {
        try {
            const [t, d, e] = await Promise.all([getTrucks(), getDrivers(), getEntries()]);
            setTrucks(t);
            setDrivers(d);
            // Show all entries sorted by date
            const sorted = [...e].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setEntries(sorted);
        } catch (error) {
            console.error('Error loading entries:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleDelete = (id: string) => {
        Alert.alert('Supprimer', 'Supprimer cette saisie ?', [
            { text: 'Annuler', style: 'cancel' },
            {
                text: 'Supprimer', style: 'destructive',
                onPress: async () => {
                    await deleteEntry(id);
                    setEntries(prev => prev.filter(e => e.id !== id));
                },
            },
        ]);
    };

    const renderEntry = ({ item: entry }: { item: Entry }) => {
        const truck = trucks.find(t => t.id === entry.camionId);
        const driver = drivers.find(d => d.id === entry.chauffeurId);
        const costs = calculateEntryCosts(entry, truck);
        const resultColor = costs.resultat >= 0 ? Colors.positive : Colors.negative;

        return (
            <TouchableOpacity
                style={styles.entryCard}
                onPress={() => { setEditingEntry(entry); setShowForm(true); }}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <Text style={styles.dateText}>{formatDate(entry.date)}</Text>
                        <View style={[styles.badge, { backgroundColor: Colors.primaryFaded }]}>
                            <Text style={[styles.badgeText, { color: Colors.primary }]}>
                                🚛 {truck?.matricule || '-'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.cardHeaderRight}>
                        <Text style={[styles.resultText, { color: resultColor }]}>
                            {costs.resultat >= 0 ? '+' : ''}{costs.resultat.toFixed(0)} TND
                        </Text>
                        <TouchableOpacity onPress={() => handleDelete(entry.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <MaterialCommunityIcons name="delete-outline" size={20} color={Colors.negative} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <Text style={styles.driverText}>👤 {driver?.nom || '-'}</Text>
                    <Text style={styles.routeText}>
                        📍 {entry.origineDelegation || entry.origineGouvernorat || 'Départ'} → {entry.delegation || entry.gouvernorat || entry.destination || 'Arrivée'}
                    </Text>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <MaterialCommunityIcons name="road-variant" size={14} color={Colors.info} />
                        <Text style={styles.statText}>{entry.kilometrage || 0} km</Text>
                    </View>
                    <View style={styles.statItem}>
                        <MaterialCommunityIcons name="gas-station" size={14} color={Colors.warning} />
                        <Text style={styles.statText}>{entry.quantiteGasoil || 0} L</Text>
                    </View>
                    <View style={styles.statItem}>
                        <MaterialCommunityIcons name="cash" size={14} color={Colors.positive} />
                        <Text style={styles.statText}>{(entry.prixLivraison || 0).toFixed(0)} TND</Text>
                    </View>
                    <View style={styles.statItem}>
                        <MaterialCommunityIcons name="wrench" size={14} color={Colors.textMuted} />
                        <Text style={styles.statText}>{(entry.maintenance || 0).toFixed(0)} TND</Text>
                    </View>
                </View>
            </TouchableOpacity>
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
            {/* Header with count */}
            <View style={styles.headerBar}>
                <Text style={styles.headerCount}>{entries.length} saisie(s)</Text>
            </View>

            <FlatList
                data={entries}
                keyExtractor={item => item.id}
                renderItem={renderEntry}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="clipboard-text-off" size={64} color={Colors.textMuted} />
                        <Text style={styles.emptyTitle}>Aucune saisie</Text>
                        <Text style={styles.emptySubtitle}>Les saisies apparaîtront ici</Text>
                    </View>
                }
            />

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => { setEditingEntry(null); setShowForm(true); }}
            >
                <MaterialCommunityIcons name="plus" size={28} color={Colors.white} />
            </TouchableOpacity>

            {/* Quick Add Form Modal */}
            {showForm && (
                <EntryFormModal
                    entry={editingEntry}
                    trucks={trucks}
                    drivers={drivers}
                    onSave={async (entry) => {
                        await saveEntry(entry);
                        setShowForm(false);
                        setEditingEntry(null);
                        loadData();
                    }}
                    onClose={() => { setShowForm(false); setEditingEntry(null); }}
                />
            )}
        </View>
    );
}

// Quick Entry Form Modal
function EntryFormModal({ entry, trucks, drivers, onSave, onClose }: {
    entry: Entry | null;
    trucks: Truck[];
    drivers: Driver[];
    onSave: (entry: Entry) => Promise<void>;
    onClose: () => void;
}) {
    const [form, setForm] = useState<Partial<Entry>>({
        date: entry?.date || new Date().toISOString().split('T')[0],
        camionId: entry?.camionId || trucks[0]?.id || '',
        chauffeurId: entry?.chauffeurId || drivers[0]?.id || '',
        origineGouvernorat: entry?.origineGouvernorat || 'Gabès',
        gouvernorat: entry?.gouvernorat || '',
        delegation: entry?.delegation || '',
        destination: entry?.destination || '',
        kilometrage: entry?.kilometrage || 0,
        quantiteGasoil: entry?.quantiteGasoil || 0,
        prixGasoilLitre: entry?.prixGasoilLitre || 2,
        maintenance: entry?.maintenance || 0,
        prixLivraison: entry?.prixLivraison || 0,
        remarques: entry?.remarques || '',
    });

    const handleSave = async () => {
        if (!form.camionId || !form.chauffeurId) {
            Alert.alert('Erreur', 'Veuillez sélectionner un camion et un chauffeur');
            return;
        }
        const newEntry: Entry = {
            id: entry?.id || '',
            date: form.date || new Date().toISOString().split('T')[0],
            camionId: form.camionId!,
            chauffeurId: form.chauffeurId!,
            origineGouvernorat: form.origineGouvernorat,
            gouvernorat: form.gouvernorat,
            delegation: form.delegation,
            destination: form.destination || form.gouvernorat || '',
            kilometrage: Number(form.kilometrage) || 0,
            quantiteGasoil: Number(form.quantiteGasoil) || 0,
            prixGasoilLitre: Number(form.prixGasoilLitre) || 2,
            maintenance: Number(form.maintenance) || 0,
            prixLivraison: Number(form.prixLivraison) || 0,
            remarques: form.remarques,
        };
        await onSave(newEntry);
    };

    const selectedTruckIdx = trucks.findIndex(t => t.id === form.camionId);
    const selectedDriverIdx = drivers.findIndex(d => d.id === form.chauffeurId);

    return (
        <View style={formStyles.overlay}>
            <View style={formStyles.modal}>
                <View style={formStyles.header}>
                    <Text style={formStyles.title}>{entry ? '✏️ Modifier' : '➕ Nouvelle Saisie'}</Text>
                    <TouchableOpacity onPress={onClose}>
                        <MaterialCommunityIcons name="close" size={24} color={Colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={[1]}
                    keyExtractor={() => 'form'}
                    renderItem={() => (
                        <View style={formStyles.formContent}>
                            {/* Date */}
                            <View style={formStyles.group}>
                                <Text style={formStyles.label}>📅 Date</Text>
                                <TextInput
                                    style={formStyles.input}
                                    value={form.date}
                                    onChangeText={v => setForm(f => ({ ...f, date: v }))}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor={Colors.textMuted}
                                />
                            </View>

                            {/* Truck Selector */}
                            <View style={formStyles.group}>
                                <Text style={formStyles.label}>🚛 Camion</Text>
                                <FlatList
                                    data={trucks}
                                    horizontal
                                    keyExtractor={t => t.id}
                                    showsHorizontalScrollIndicator={false}
                                    renderItem={({ item: t }) => (
                                        <TouchableOpacity
                                            style={[formStyles.chip, form.camionId === t.id && formStyles.chipActive]}
                                            onPress={() => setForm(f => ({ ...f, camionId: t.id }))}
                                        >
                                            <Text style={[formStyles.chipText, form.camionId === t.id && formStyles.chipTextActive]}>
                                                {t.matricule}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>

                            {/* Driver Selector */}
                            <View style={formStyles.group}>
                                <Text style={formStyles.label}>👤 Chauffeur</Text>
                                <FlatList
                                    data={drivers}
                                    horizontal
                                    keyExtractor={d => d.id}
                                    showsHorizontalScrollIndicator={false}
                                    renderItem={({ item: d }) => (
                                        <TouchableOpacity
                                            style={[formStyles.chip, form.chauffeurId === d.id && formStyles.chipActive]}
                                            onPress={() => setForm(f => ({ ...f, chauffeurId: d.id }))}
                                        >
                                            <Text style={[formStyles.chipText, form.chauffeurId === d.id && formStyles.chipTextActive]}>
                                                {d.nom}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>

                            {/* Destination */}
                            <View style={formStyles.group}>
                                <Text style={formStyles.label}>📍 Destination</Text>
                                <TextInput
                                    style={formStyles.input}
                                    value={form.destination}
                                    onChangeText={v => setForm(f => ({ ...f, destination: v, gouvernorat: v }))}
                                    placeholder="Ex: Tunis, Sfax..."
                                    placeholderTextColor={Colors.textMuted}
                                />
                            </View>

                            {/* Number fields - row */}
                            <View style={formStyles.row}>
                                <View style={formStyles.halfGroup}>
                                    <Text style={formStyles.label}>🛣️ Km</Text>
                                    <TextInput
                                        style={formStyles.input}
                                        value={String(form.kilometrage || '')}
                                        onChangeText={v => setForm(f => ({ ...f, kilometrage: Number(v) || 0 }))}
                                        keyboardType="numeric"
                                        placeholderTextColor={Colors.textMuted}
                                    />
                                </View>
                                <View style={formStyles.halfGroup}>
                                    <Text style={formStyles.label}>⛽ Gasoil (L)</Text>
                                    <TextInput
                                        style={formStyles.input}
                                        value={String(form.quantiteGasoil || '')}
                                        onChangeText={v => setForm(f => ({ ...f, quantiteGasoil: Number(v) || 0 }))}
                                        keyboardType="numeric"
                                        placeholderTextColor={Colors.textMuted}
                                    />
                                </View>
                            </View>

                            <View style={formStyles.row}>
                                <View style={formStyles.halfGroup}>
                                    <Text style={formStyles.label}>💵 Prix Livraison</Text>
                                    <TextInput
                                        style={formStyles.input}
                                        value={String(form.prixLivraison || '')}
                                        onChangeText={v => setForm(f => ({ ...f, prixLivraison: Number(v) || 0 }))}
                                        keyboardType="numeric"
                                        placeholderTextColor={Colors.textMuted}
                                    />
                                </View>
                                <View style={formStyles.halfGroup}>
                                    <Text style={formStyles.label}>🔧 Maintenance</Text>
                                    <TextInput
                                        style={formStyles.input}
                                        value={String(form.maintenance || '')}
                                        onChangeText={v => setForm(f => ({ ...f, maintenance: Number(v) || 0 }))}
                                        keyboardType="numeric"
                                        placeholderTextColor={Colors.textMuted}
                                    />
                                </View>
                            </View>

                            {/* Remarques */}
                            <View style={formStyles.group}>
                                <Text style={formStyles.label}>📝 Remarques</Text>
                                <TextInput
                                    style={[formStyles.input, { height: 60 }]}
                                    value={form.remarques}
                                    onChangeText={v => setForm(f => ({ ...f, remarques: v }))}
                                    multiline
                                    placeholderTextColor={Colors.textMuted}
                                />
                            </View>
                        </View>
                    )}
                />

                {/* Save Button */}
                <TouchableOpacity style={formStyles.saveBtn} onPress={handleSave}>
                    <MaterialCommunityIcons name="check" size={22} color={Colors.white} />
                    <Text style={formStyles.saveBtnText}>Enregistrer</Text>
                </TouchableOpacity>
            </View>
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
    headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, paddingBottom: Spacing.sm },
    headerCount: { fontSize: FontSize.sm, color: Colors.textSecondary },
    list: { padding: Spacing.md, paddingTop: 0, paddingBottom: 100 },

    entryCard: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        padding: Spacing.md, marginBottom: Spacing.sm,
        borderLeftWidth: 3, borderLeftColor: Colors.primary,
        ...Shadows.small,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    dateText: { fontSize: FontSize.xs, color: Colors.textMuted },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.sm },
    badgeText: { fontSize: FontSize.xs, fontWeight: '600' },
    resultText: { fontSize: FontSize.md, fontWeight: '700' },
    cardBody: { marginBottom: Spacing.sm },
    driverText: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, marginBottom: 2 },
    routeText: { fontSize: FontSize.sm, color: Colors.textSecondary },
    statsRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surfaceLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.sm },
    statText: { fontSize: FontSize.xs, color: Colors.textSecondary },

    emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl * 2 },
    emptyTitle: { fontSize: FontSize.lg, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.md },
    emptySubtitle: { fontSize: FontSize.sm, color: Colors.textMuted },

    fab: {
        position: 'absolute', bottom: 20, right: 20,
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
        ...Shadows.card,
    },
});

const formStyles = StyleSheet.create({
    overlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: Colors.overlay, justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl,
        borderTopRightRadius: BorderRadius.xl, maxHeight: '90%', padding: Spacing.lg,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
    title: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
    formContent: { gap: Spacing.md },
    group: { marginBottom: Spacing.sm },
    halfGroup: { flex: 1 },
    row: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.sm },
    label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs },
    input: {
        backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border,
        borderRadius: BorderRadius.sm, padding: Spacing.sm, paddingHorizontal: Spacing.md,
        color: Colors.text, fontSize: FontSize.md,
    },
    chip: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full,
        backgroundColor: Colors.surfaceLight, marginRight: Spacing.xs, borderWidth: 1, borderColor: Colors.border,
    },
    chipActive: { backgroundColor: Colors.primaryFaded, borderColor: Colors.primary },
    chipText: { fontSize: FontSize.xs, color: Colors.textSecondary },
    chipTextActive: { color: Colors.primary, fontWeight: '700' },
    saveBtn: {
        flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center', alignItems: 'center',
        backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.md,
    },
    saveBtnText: { fontSize: FontSize.md, fontWeight: '700', color: Colors.white },
});
