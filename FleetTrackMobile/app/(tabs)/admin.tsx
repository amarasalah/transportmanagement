/**
 * Admin Screen - Role & Permission Management
 * Super Admin can assign roles and toggle individual permissions per user
 * Matches the web app's granular permission system
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, Alert, SafeAreaView, StatusBar, RefreshControl,
    Switch, Modal, ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import {
    getAllUsers, getAllRoles, updateUserRole, updateUserPermissions,
    AppUser, Role, PERMISSION_KEYS, Permissions, emptyPermissions, fullPermissions,
} from '@/services/auth';

// Group permission keys for display
const GROUPS = [
    { label: '🏠 Core', keys: ['dashboard', 'entries', 'planification', 'reports'] },
    { label: '🚛 Flotte', keys: ['trucks', 'drivers'] },
    { label: '💼 ERP', keys: ['achat', 'vente', 'articles'] },
    { label: '⚙️ Système', keys: ['settings'] },
];

export default function AdminScreen() {
    const { user } = useAuth();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    // Edit modal state
    const [editUser, setEditUser] = useState<AppUser | null>(null);
    const [editPerms, setEditPerms] = useState<Permissions>({});
    const [selectedRoleId, setSelectedRoleId] = useState('');
    const [showRolePicker, setShowRolePicker] = useState(false);
    const [saving, setSaving] = useState(false);

    const loadData = useCallback(async () => {
        setRefreshing(true);
        try {
            const [allUsers, allRoles] = await Promise.all([getAllUsers(), getAllRoles()]);
            // Sort: super_admin first, then by roleName
            const sorted = allUsers.sort((a, b) => {
                if (a.roleId === 'super_admin') return -1;
                if (b.roleId === 'super_admin') return 1;
                return (a.roleName || '').localeCompare(b.roleName || '');
            });
            setUsers(sorted);
            setRoles(allRoles);
        } catch (err) {
            Alert.alert('Erreur', 'Impossible de charger les données');
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Open edit modal for a user
    const openEdit = (u: AppUser) => {
        setEditUser(u);
        setEditPerms({ ...u.permissions });
        setSelectedRoleId(u.roleId || '');
    };

    // Apply a role's permissions to the edit form
    const applyRole = (role: Role) => {
        setSelectedRoleId(role.id);
        setEditPerms({ ...role.permissions });
        setShowRolePicker(false);
    };

    // Toggle a single permission
    const togglePerm = (key: string) => {
        setEditPerms(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Save changes
    const handleSave = async () => {
        if (!editUser) return;
        setSaving(true);
        try {
            const role = roles.find(r => r.id === selectedRoleId);
            const roleName = role?.name || editUser.roleName || 'Custom';
            await updateUserRole(editUser.uid, selectedRoleId, roleName, editPerms);
            Alert.alert('✅ Succès', `Rôle de ${editUser.displayName} mis à jour`);
            setEditUser(null);
            loadData();
        } catch (err) {
            Alert.alert('Erreur', 'Impossible de sauvegarder');
        } finally {
            setSaving(false);
        }
    };

    const getRoleBadge = (u: AppUser) => {
        if (u.role === 'super_admin' || u.roleId === 'super_admin') {
            return { label: 'Super Admin', color: '#f59e0b', icon: 'crown' };
        }
        const role = roles.find(r => r.id === u.roleId);
        if (role) {
            return { label: role.name, color: '#8b5cf6', icon: 'shield-account' };
        }
        return { label: u.roleName || 'Utilisateur', color: '#10b981', icon: 'account' };
    };

    const getPermLabel = (key: string): string => {
        const found = PERMISSION_KEYS.find(p => p.key === key);
        return found?.label || key;
    };

    // Count active permissions
    const countPerms = (perms: Permissions) => {
        return Object.values(perms || {}).filter(v => v === true).length;
    };

    const renderUser = ({ item }: { item: AppUser }) => {
        const badge = getRoleBadge(item);
        const isMe = item.uid === user?.uid;
        const isSA = item.role === 'super_admin' || item.roleId === 'super_admin';
        const activePerms = countPerms(item.permissions);

        return (
            <View style={styles.userCard}>
                <View style={styles.userInfo}>
                    <View style={[styles.userAvatar, { borderColor: badge.color + '40' }]}>
                        <MaterialCommunityIcons name={badge.icon as any} size={22} color={badge.color} />
                    </View>
                    <View style={styles.userDetails}>
                        <Text style={styles.userName}>
                            {item.displayName || 'Sans nom'}
                            {isMe ? ' (Vous)' : ''}
                        </Text>
                        <Text style={styles.userEmail}>{item.email}</Text>
                        <View style={styles.permSummary}>
                            <View style={[styles.roleBadge, { backgroundColor: badge.color + '20' }]}>
                                <Text style={[styles.roleBadgeText, { color: badge.color }]}>{badge.label}</Text>
                            </View>
                            {!isSA && (
                                <Text style={styles.permCount}>
                                    {activePerms}/{PERMISSION_KEYS.length} permissions
                                </Text>
                            )}
                            {isSA && (
                                <Text style={[styles.permCount, { color: '#f59e0b' }]}>Accès complet</Text>
                            )}
                        </View>
                    </View>
                </View>
                {!isMe && !isSA && (
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                        <MaterialCommunityIcons name="pencil-circle" size={20} color="#8b5cf6" />
                        <Text style={styles.editBtnText}>Modifier</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    // ==================== EDIT MODAL ====================
    const renderEditModal = () => {
        if (!editUser) return null;
        const currentRole = roles.find(r => r.id === selectedRoleId);

        return (
            <Modal visible={true} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Header */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Modifier les permissions</Text>
                                <Text style={styles.modalSubtitle}>{editUser.displayName}</Text>
                            </View>

                            {/* Role Selector */}
                            <Text style={styles.sectionTitle}>📋 Rôle</Text>
                            <TouchableOpacity
                                style={styles.roleSelector}
                                onPress={() => setShowRolePicker(!showRolePicker)}
                            >
                                <Text style={styles.roleSelectorText}>
                                    {currentRole?.name || 'Sélectionner un rôle...'}
                                </Text>
                                <MaterialCommunityIcons
                                    name={showRolePicker ? 'chevron-up' : 'chevron-down'}
                                    size={20} color="#94a3b8"
                                />
                            </TouchableOpacity>

                            {showRolePicker && (
                                <View style={styles.roleList}>
                                    {roles.map(role => (
                                        <TouchableOpacity
                                            key={role.id}
                                            style={[
                                                styles.roleItem,
                                                selectedRoleId === role.id && styles.roleItemActive,
                                            ]}
                                            onPress={() => applyRole(role)}
                                        >
                                            <Text style={[
                                                styles.roleItemText,
                                                selectedRoleId === role.id && styles.roleItemTextActive,
                                            ]}>
                                                {role.name}
                                            </Text>
                                            <Text style={styles.roleItemPerms}>
                                                {countPerms(role.permissions)} perms
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            {/* Permission Toggles */}
                            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>🔐 Permissions</Text>

                            {GROUPS.map(group => (
                                <View key={group.label} style={styles.permGroup}>
                                    <Text style={styles.groupLabel}>{group.label}</Text>
                                    {group.keys.map(key => (
                                        <View key={key} style={styles.permRow}>
                                            <Text style={styles.permLabel}>{getPermLabel(key)}</Text>
                                            <Switch
                                                value={editPerms[key] === true}
                                                onValueChange={() => togglePerm(key)}
                                                trackColor={{ false: '#334155', true: '#7c3aed' }}
                                                thumbColor={editPerms[key] ? '#a78bfa' : '#64748b'}
                                            />
                                        </View>
                                    ))}
                                </View>
                            ))}

                            {/* Quick actions */}
                            <View style={styles.quickActions}>
                                <TouchableOpacity
                                    style={[styles.quickBtn, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}
                                    onPress={() => setEditPerms(fullPermissions())}
                                >
                                    <Text style={[styles.quickBtnText, { color: '#10b981' }]}>✅ Tout activer</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.quickBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}
                                    onPress={() => setEditPerms(emptyPermissions())}
                                >
                                    <Text style={[styles.quickBtnText, { color: '#ef4444' }]}>❌ Tout désactiver</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Action buttons */}
                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => setEditUser(null)}
                                >
                                    <Text style={styles.cancelBtnText}>Annuler</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.saveBtn, saving && { opacity: 0.5 }]}
                                    onPress={handleSave}
                                    disabled={saving}
                                >
                                    <MaterialCommunityIcons name="content-save" size={18} color="#fff" />
                                    <Text style={styles.saveBtnText}>
                                        {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>👑 Administration</Text>
                <Text style={styles.headerSub}>
                    {users.length} utilisateur(s) · {roles.length} rôle(s)
                </Text>
            </View>

            <View style={styles.infoBox}>
                <MaterialCommunityIcons name="information" size={16} color="#3b82f6" />
                <Text style={styles.infoText}>
                    Assignez des rôles et gérez les permissions individuelles.
                    Les rôles sont synchronisés avec le panneau web Admin.
                </Text>
            </View>

            <FlatList
                data={users}
                keyExtractor={(item) => item.uid}
                renderItem={renderUser}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={loadData}
                        tintColor="#8b5cf6" colors={['#8b5cf6']} />
                }
                ListEmptyComponent={
                    <Text style={styles.emptyText}>Aucun utilisateur trouvé</Text>
                }
            />

            {renderEditModal()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { padding: 20, paddingBottom: 8 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: '#f1f5f9' },
    headerSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
    infoBox: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        marginHorizontal: 20, marginBottom: 12,
        borderRadius: 8, padding: 12,
    },
    infoText: { flex: 1, fontSize: 12, color: '#64748b', lineHeight: 18 },
    list: { padding: 20, paddingTop: 0, paddingBottom: 100 },

    // User Card
    userCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 12, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.08)',
    },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    userAvatar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1.5,
    },
    userDetails: { flex: 1 },
    userName: { fontSize: 15, fontWeight: '600', color: '#f1f5f9' },
    userEmail: { fontSize: 12, color: '#64748b', marginTop: 2 },
    permSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    roleBadgeText: { fontSize: 11, fontWeight: '700' },
    permCount: { fontSize: 11, color: '#64748b' },
    editBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        alignSelf: 'flex-end', marginTop: 8,
        backgroundColor: 'rgba(139, 92, 246, 0.12)',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    },
    editBtnText: { fontSize: 12, color: '#8b5cf6', fontWeight: '600' },

    // Modal
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        maxHeight: '90%', padding: 20,
    },
    modalHeader: { marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '800', color: '#f1f5f9' },
    modalSubtitle: { fontSize: 14, color: '#8b5cf6', marginTop: 4 },

    sectionTitle: {
        fontSize: 14, fontWeight: '700', color: '#94a3b8',
        marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1,
    },

    // Role Selector
    roleSelector: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.15)',
        borderRadius: 10, padding: 14,
    },
    roleSelectorText: { fontSize: 15, color: '#f1f5f9', fontWeight: '600' },
    roleList: {
        marginTop: 6, backgroundColor: 'rgba(15, 23, 42, 0.8)',
        borderRadius: 10, overflow: 'hidden',
        borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.1)',
    },
    roleItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(148, 163, 184, 0.06)',
    },
    roleItemActive: { backgroundColor: 'rgba(139, 92, 246, 0.15)' },
    roleItemText: { fontSize: 14, color: '#cbd5e1', fontWeight: '500' },
    roleItemTextActive: { color: '#a78bfa', fontWeight: '700' },
    roleItemPerms: { fontSize: 11, color: '#64748b' },

    // Permission groups
    permGroup: {
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        borderRadius: 10, padding: 12, marginBottom: 10,
        borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.06)',
    },
    groupLabel: {
        fontSize: 13, fontWeight: '700', color: '#94a3b8',
        marginBottom: 8,
    },
    permRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1, borderBottomColor: 'rgba(148, 163, 184, 0.05)',
    },
    permLabel: { fontSize: 14, color: '#e2e8f0', flex: 1 },

    // Quick actions
    quickActions: {
        flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 20,
    },
    quickBtn: {
        flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
    },
    quickBtnText: { fontSize: 13, fontWeight: '600' },

    // Action buttons
    modalActions: {
        flexDirection: 'row', gap: 10, marginBottom: 20,
    },
    cancelBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 10,
        backgroundColor: 'rgba(100, 116, 139, 0.15)',
        alignItems: 'center',
    },
    cancelBtnText: { fontSize: 15, color: '#94a3b8', fontWeight: '600' },
    saveBtn: {
        flex: 2, flexDirection: 'row', gap: 8,
        paddingVertical: 14, borderRadius: 10,
        backgroundColor: '#7c3aed',
        alignItems: 'center', justifyContent: 'center',
    },
    saveBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },

    emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 14 },
});
