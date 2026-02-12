/**
 * Profile Screen - User info, name edit, logout
 */
import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    Alert, ScrollView, SafeAreaView, StatusBar
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';

export default function ProfileScreen() {
    const { user, signOut, updateName } = useAuth();
    const [editing, setEditing] = useState(false);
    const [newName, setNewName] = useState(user?.displayName || '');
    const [saving, setSaving] = useState(false);

    const handleSaveName = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        try {
            await updateName(newName.trim());
            setEditing(false);
            Alert.alert('✅ Succès', 'Nom mis à jour');
        } catch {
            Alert.alert('❌ Erreur', 'Impossible de mettre à jour le nom');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Déconnexion', style: 'destructive', onPress: signOut },
        ]);
    };

    const roleLabels: Record<string, { label: string; color: string; icon: string }> = {
        super_admin: { label: 'Super Admin', color: '#f59e0b', icon: 'crown' },
        admin: { label: 'Admin', color: '#3b82f6', icon: 'shield-account' },
        user: { label: 'Utilisateur', color: '#10b981', icon: 'account' },
    };
    const roleInfo = roleLabels[user?.role || 'user'] || roleLabels.user;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
            <ScrollView contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Mon Profil</Text>
                </View>

                {/* Avatar & Name */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatar}>
                        <MaterialCommunityIcons name="account" size={48} color="#8b5cf6" />
                    </View>
                    {editing ? (
                        <View style={styles.editRow}>
                            <TextInput
                                style={styles.nameInput}
                                value={newName}
                                onChangeText={setNewName}
                                autoFocus
                                placeholder="Votre nom"
                                placeholderTextColor="#64748b"
                            />
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveName} disabled={saving}>
                                <Text style={styles.saveBtnText}>{saving ? '...' : '✓'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { setEditing(false); setNewName(user?.displayName || ''); }}>
                                <Text style={styles.cancelText}>✕</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity onPress={() => setEditing(true)} style={styles.nameRow}>
                            <Text style={styles.userName}>{user?.displayName || 'Utilisateur'}</Text>
                            <MaterialCommunityIcons name="pencil" size={16} color="#64748b" />
                        </TouchableOpacity>
                    )}
                    <Text style={styles.userEmail}>{user?.email}</Text>
                </View>

                {/* Role Badge */}
                <View style={[styles.roleCard, { borderColor: roleInfo.color + '40' }]}>
                    <MaterialCommunityIcons name={roleInfo.icon as any} size={24} color={roleInfo.color} />
                    <View>
                        <Text style={styles.roleLabel}>Rôle</Text>
                        <Text style={[styles.roleValue, { color: roleInfo.color }]}>{roleInfo.label}</Text>
                    </View>
                </View>

                {/* Info Cards */}
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="calendar" size={20} color="#64748b" />
                        <Text style={styles.infoLabel}>Membre depuis</Text>
                        <Text style={styles.infoValue}>
                            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '--'}
                        </Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.infoRow}>
                        <MaterialCommunityIcons name="shield-check" size={20} color="#64748b" />
                        <Text style={styles.infoLabel}>Statut</Text>
                        <Text style={[styles.infoValue, { color: '#10b981' }]}>Approuvé</Text>
                    </View>
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <MaterialCommunityIcons name="logout" size={20} color="#ef4444" />
                    <Text style={styles.logoutText}>Déconnexion</Text>
                </TouchableOpacity>

                <Text style={styles.version}>FleetTrack Mobile v1.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    content: { padding: 20, paddingTop: 12 },
    header: { marginBottom: 24 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: '#f1f5f9' },
    avatarSection: { alignItems: 'center', marginBottom: 24 },
    avatar: {
        width: 90, height: 90, borderRadius: 45,
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: 'rgba(139, 92, 246, 0.3)',
        marginBottom: 12,
    },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    userName: { fontSize: 22, fontWeight: '700', color: '#f1f5f9' },
    userEmail: { fontSize: 14, color: '#64748b', marginTop: 4 },
    editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    nameInput: {
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        borderWidth: 1, borderColor: '#8b5cf6',
        borderRadius: 8, padding: 10, color: '#f1f5f9',
        fontSize: 16, width: 180,
    },
    saveBtn: {
        backgroundColor: '#8b5cf6', borderRadius: 6,
        paddingHorizontal: 12, paddingVertical: 8,
    },
    saveBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
    cancelText: { color: '#ef4444', fontSize: 18, fontWeight: '700' },
    roleCard: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 12, padding: 16, marginBottom: 16,
        borderWidth: 1,
    },
    roleLabel: { fontSize: 12, color: '#94a3b8' },
    roleValue: { fontSize: 16, fontWeight: '700' },
    infoCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 12, padding: 16, marginBottom: 24,
        borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.1)',
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    infoLabel: { flex: 1, fontSize: 14, color: '#94a3b8' },
    infoValue: { fontSize: 14, fontWeight: '600', color: '#f1f5f9' },
    divider: { height: 1, backgroundColor: 'rgba(148, 163, 184, 0.1)', marginVertical: 4 },
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)',
        borderRadius: 12, padding: 14,
    },
    logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
    version: { textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 20 },
});
