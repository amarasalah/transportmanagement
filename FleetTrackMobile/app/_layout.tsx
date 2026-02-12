/**
 * Root Layout - Auth-conditional routing
 * No pending state; users are pre-approved by Super Admin
 */
import React from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

function RootNavigator() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const segments = useSegments();

    React.useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!user) {
            // Not logged in → go to login
            if (!inAuthGroup) {
                router.replace('/(auth)/login');
            }
        } else {
            // Logged in → go to main tabs
            if (inAuthGroup) {
                router.replace('/(tabs)');
            }
        }
    }, [user, loading, segments]);

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#8b5cf6" />
            </View>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <RootNavigator />
        </AuthProvider>
    );
}

const styles = StyleSheet.create({
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f172a',
    },
});
