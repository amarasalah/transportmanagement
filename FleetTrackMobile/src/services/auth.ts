/**
 * Auth Service - Firebase Authentication + Permissions
 * Login only; Super Admin creates users via web admin panel
 */
import { app, db, doc, getDoc, getDocs, setDoc, updateDoc, collection } from './firebase';
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged as firebaseOnAuthStateChanged,
    User as FirebaseUser,
} from 'firebase/auth';

const auth = getAuth(app);

// Permission keys matching the web app
export const PERMISSION_KEYS = [
    'dashboard', 'entries', 'planification', 'trucks', 'drivers',
    'reports', 'achat', 'vente', 'articles', 'settings'
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];
export type Permissions = Record<PermissionKey, boolean>;

export interface AppUser {
    uid: string;
    email: string;
    displayName: string;
    role: string;
    roleId: string;
    roleName: string;
    permissions: Permissions;
    driverId?: string;
    camionId?: string;
    status: 'approved';
    createdAt: string;
    createdBy: string;
}

/**
 * Check if user has a specific permission
 */
export function hasPermission(user: AppUser | null, key: PermissionKey): boolean {
    if (!user) return false;
    if (user.role === 'super_admin' || user.roleId === 'super_admin') return true;
    return user.permissions?.[key] === true;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<AppUser> {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const profile = await getUserProfile(cred.user.uid);
    if (!profile) throw new Error('Profil utilisateur introuvable');
    return profile;
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
    await firebaseSignOut(auth);
}

/**
 * Listen for auth state changes
 */
export function onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return firebaseOnAuthStateChanged(auth, callback);
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<AppUser | null> {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data() as AppUser;
}

/**
 * Get all users (for admin panel)
 */
export async function getAllUsers(): Promise<AppUser[]> {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => d.data() as AppUser);
}

/**
 * Update display name
 */
export async function updateDisplayName(uid: string, displayName: string): Promise<void> {
    await updateDoc(doc(db, 'users', uid), { displayName });
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(uid: string, roleId: string, roleName: string, permissions: Permissions): Promise<void> {
    await updateDoc(doc(db, 'users', uid), { roleId, roleName, permissions });
}
