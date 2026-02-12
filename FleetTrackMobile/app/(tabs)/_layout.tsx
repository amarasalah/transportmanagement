/**
 * Tabs Layout - Permission-based navigation
 * Tabs shown/hidden based on user.permissions
 * Admin tab visible only to super_admin
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { hasPermission } from '../../src/services/auth';

export default function TabsLayout() {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'super_admin' || user?.roleId === 'super_admin';

    const canSee = (key: 'dashboard' | 'entries' | 'trucks' | 'planification') =>
        hasPermission(user, key);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#1e293b',
                    borderTopColor: 'rgba(148, 163, 184, 0.1)',
                    height: 60,
                    paddingBottom: 8,
                },
                tabBarActiveTintColor: '#8b5cf6',
                tabBarInactiveTintColor: '#64748b',
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Accueil',
                    href: canSee('dashboard') ? undefined : null,
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="entries"
                options={{
                    title: 'Saisies',
                    href: canSee('entries') ? undefined : null,
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="clipboard-text" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="trucks"
                options={{
                    title: 'Camions',
                    href: canSee('trucks') ? undefined : null,
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="truck" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="planning"
                options={{
                    title: 'Planning',
                    href: canSee('planification') ? undefined : null,
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="calendar-clock" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profil',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="account-circle" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="admin"
                options={{
                    title: 'Admin',
                    href: isSuperAdmin ? undefined : null,
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="crown" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="more"
                options={{
                    href: null, // Hidden from tab bar
                }}
            />
        </Tabs>
    );
}
