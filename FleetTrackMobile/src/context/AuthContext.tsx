/**
 * Auth Context - Provides auth state to the entire app
 * Login-only model; no self-registration
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    onAuthStateChanged,
    getUserProfile,
    signIn,
    signOut,
    updateDisplayName,
    AppUser,
} from '@/services/auth';

interface AuthContextType {
    user: AppUser | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<AppUser>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
    updateName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signIn: async () => { throw new Error('Not initialized'); },
    signOut: async () => { },
    refreshUser: async () => { },
    updateName: async () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(async (firebaseUser: any) => {
            if (firebaseUser) {
                try {
                    const profile = await getUserProfile(firebaseUser.uid);
                    setUser(profile);
                } catch (error) {
                    console.error('Error loading user profile:', error);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const handleSignIn = async (email: string, password: string): Promise<AppUser> => {
        const appUser = await signIn(email, password);
        setUser(appUser);
        return appUser;
    };

    const handleSignOut = async () => {
        await signOut();
        setUser(null);
    };

    const refreshUser = async () => {
        if (user?.uid) {
            const profile = await getUserProfile(user.uid);
            setUser(profile);
        }
    };

    const updateName = async (name: string) => {
        if (user?.uid) {
            await updateDisplayName(user.uid, name);
            setUser((prev: AppUser | null) => prev ? { ...prev, displayName: name } : prev);
        }
    };

    const value: AuthContextType = {
        user,
        loading,
        signIn: handleSignIn,
        signOut: handleSignOut,
        refreshUser,
        updateName,
    };

    return React.createElement(AuthContext.Provider, { value }, children);
}
