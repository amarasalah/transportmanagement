/**
 * Admin Screen - Super Admin creates and manages users
 * No self-registration or pending workflow
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    FlatList, Alert, SafeAreaView, StatusBar, RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { getAllUsers, updateUserRole, AppUser } from '@/services/auth';

export default function AdminScreen() {
    const { user } = useAuth();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const loadUsers = useCallback(async () => {
        setRefreshing(true);
        try {
            const allUsers = await getAllUsers();
            const sorted = allUsers.sort((a, b) => {
                const order: Record<string, number> = { super_admin: 0, admin: 1, user: 2 };
                return (order[a.role] || 99) - (order[b.role] || 99);
            });
            setUsers(sorted);
        } catch (err) {
            Alert.alert('Erreur', 'Impossible de charger les utilisateurs');
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    const handleRoleChange = async (uid: string, newRole: string) => {
        const roleLabel = newRole === 'super_admin' ? 'Super Admin' : newRole === 'admin' ? 'Admin' : 'Utilisateur';
        Alert.alert('Changer le rôle', `Assigner le rôle "${roleLabel}" ?`, [
            { text: 'Annuler', style: 'cancel' },
            {
                text: 'Confirmer', onPress: async () => {
                    try {
                        await updateUserRole(uid, newRole);
                        loadUsers();
                    } catch {
                        Alert.alert('Erreur', 'Impossible de changer le rôle');
                    }
                }
            },
        ]);
    };

    const getRoleBadge = (role: string) => {
        const badges: Record<string, { label: string; color: string; icon: string }> = {
            super_admin: { label: 'Super Admin', color: '#f59e0b', icon: 'crown' },
            admin: { label: 'Admin', color: '#3b82f6', icon: 'shield-account' },
            user: { label: 'Utilisateur', color: '#10b981', icon: 'account' },
        };
        return badges[role] || badges.user;
    };

    const renderUser = ({ item }: { item: AppUser }) => {
        const badge = getRoleBadge(item.role);
        const isMe = item.uid === user?.uid;

        return (
            <View style={styles.userCard}>
                <View style={styles.userInfo}>
                    <View style={[styles.userAvatar, { borderColor: badge.color + '40' }]}>
                        <MaterialCommunityIcons name={badge.icon as any} size={20} color={badge.color} />
                    </View>
                    <View style={styles.userDetails}>
                        <Text style={styles.userName}>
                            {item.displayName || 'Sans nom'}
                            {isMe ? ' (Vous)' : ''}
                        </Text>
                        <Text style={styles.userEmail}>{item.email}</Text>
                    </View>
                </View>
                <View style={styles.userActions}>
                    <View style={[styles.roleBadge, { backgroundColor: badge.color + '20' }]}>
                        <Text style={[styles.roleBadgeText, { color: badge.color }]}>{badge.label}</Text>
                    </View>
                    {!isMe && (
                        <View style={styles.roleButtons}>
                            {item.role !== 'user' && (
                                <TouchableOpacity style={styles.roleBtn} onPress={() => handleRoleChange(item.uid, 'user')}>
                                    <Text style={styles.roleBtnText}>👤</Text>
                                </TouchableOpacity>
                            )}
                            {item.role !== 'admin' && (
                                <TouchableOpacity style={styles.roleBtn} onPress={() => handleRoleChange(item.uid, 'admin')}>
                                    <Text style={styles.roleBtnText}>🛡️</Text>
                                </TouchableOpacity>
                            )}
                            {item.role !== 'super_admin' && (
                                <TouchableOpacity style={styles.roleBtn} onPress={() => handleRoleChange(item.uid, 'super_admin')}>
                                    <Text style={styles.roleBtnText}>👑</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>👑 Administration</Text>
                <Text style={styles.headerSub}>{users.length} utilisateur(s)</Text>
            </View>

            <View style={styles.infoBox}>
                <MaterialCommunityIcons name="information" size={16} color="#3b82f6" />
                <Text style={styles.infoText}>
                    Créez de nouveaux utilisateurs via le panneau web Admin.
                    Vous pouvez gérer les rôles ici.
                </Text>
            </View>

            <FlatList
                data={users}
                keyExtractor={(item) => item.uid}
                renderItem={renderUser}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={loadUsers}
                        tintColor="#8b5cf6" colors={['#8b5cf6']} />
                }
                ListEmptyComponent={
                    <Text style={styles.emptyText}>Aucun utilisateur trouvé</Text>
                }
            />
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
    list: { padding: 20, paddingTop: 0 },
    userCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 12, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.08)',
    },
    userInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    userAvatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1,
    },
    userDetails: { flex: 1 },
    userName: { fontSize: 15, fontWeight: '600', color: '#f1f5f9' },
    userEmail: { fontSize: 12, color: '#64748b', marginTop: 2 },
    userActions: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
    },
    roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    roleBadgeText: { fontSize: 12, fontWeight: '600' },
    roleButtons: { flexDirection: 'row', gap: 6 },
    roleBtn: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.15)',
        borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    },
    roleBtnText: { fontSize: 14 },
    emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 14 },
});
