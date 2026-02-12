/**
 * Login Screen - Login only, no registration
 * Accounts created by Super Admin
 */
import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, SafeAreaView, StatusBar, KeyboardAvoidingView,
    Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';

export default function LoginScreen() {
    const { signIn } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password) {
            Alert.alert('⚠️ Erreur', 'Veuillez remplir tous les champs');
            return;
        }

        setLoading(true);
        try {
            await signIn(email.trim(), password);
            // Navigation handled by root layout auth effect
        } catch (err: any) {
            const code = err?.code;
            const msg = code === 'auth/invalid-credential'
                ? 'Email ou mot de passe incorrect'
                : code === 'auth/too-many-requests'
                    ? 'Trop de tentatives. Réessayez plus tard'
                    : err?.message || 'Erreur de connexion';
            Alert.alert('❌ Erreur', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    {/* Logo */}
                    <View style={styles.logoSection}>
                        <View style={styles.logoIcon}>
                            <Text style={styles.logoEmoji}>🚛</Text>
                        </View>
                        <Text style={styles.logoTitle}>FleetTrack</Text>
                        <Text style={styles.logoSubtitle}>Gestion de flotte intelligente</Text>
                    </View>

                    {/* Login Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>🔐 Connexion</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>📧 Email</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="votre@email.com"
                                placeholderTextColor="#64748b"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>🔒 Mot de passe</Text>
                            <View style={styles.passwordRow}>
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="••••••••"
                                    placeholderTextColor="#64748b"
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity
                                    style={styles.eyeBtn}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text style={styles.loginBtnText}>Se connecter</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.infoBox}>
                            <Text style={styles.infoText}>
                                ℹ️ Votre compte doit être créé par le Super Admin pour accéder à l'application.
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.footer}>🔥 Firebase · FleetTrack v1.0</Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    keyboardView: { flex: 1 },
    content: {
        flex: 1, justifyContent: 'center', padding: 24,
    },
    logoSection: { alignItems: 'center', marginBottom: 32 },
    logoIcon: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: 'rgba(139, 92, 246, 0.3)',
        marginBottom: 12,
    },
    logoEmoji: { fontSize: 36 },
    logoTitle: { fontSize: 28, fontWeight: '800', color: '#a78bfa' },
    logoSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
    card: {
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        borderRadius: 16, padding: 24,
        borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.1)',
    },
    cardTitle: {
        fontSize: 20, fontWeight: '700', color: '#f1f5f9',
        textAlign: 'center', marginBottom: 20,
    },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 6 },
    input: {
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.1)',
        borderRadius: 10, padding: 12, paddingHorizontal: 16,
        color: '#f1f5f9', fontSize: 14,
    },
    passwordRow: { flexDirection: 'row', alignItems: 'center' },
    eyeBtn: { position: 'absolute', right: 12 },
    eyeText: { fontSize: 18 },
    loginBtn: {
        backgroundColor: '#8b5cf6', borderRadius: 10,
        padding: 14, alignItems: 'center', marginTop: 4,
    },
    loginBtnDisabled: { opacity: 0.6 },
    loginBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
    infoBox: {
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        borderRadius: 8, padding: 10, marginTop: 16,
    },
    infoText: { color: '#64748b', fontSize: 11, textAlign: 'center' },
    footer: { color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 20 },
});
