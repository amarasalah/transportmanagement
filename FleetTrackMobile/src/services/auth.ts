/**
 * Auth Service - Firebase Authentication + Granular Permissions
 * Login only; Super Admin creates users via web admin panel
 * Roles & permissions matching the web app system
 */
import { app, auth, db, doc, getDoc, getDocs, setDoc, updateDoc, collection } from './firebase';
import {
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged as firebaseOnAuthStateChanged,
    User as FirebaseUser,
} from 'firebase/auth';
import { COLLECTIONS } from '@/constants/collections';


// ============================================================
// PERMISSION KEYS — matching web app auth-firebase.js
// ============================================================

export const PERMISSION_KEYS = [
    { key: 'dashboard', label: '📊 Tableau de bord', group: 'core' },
    { key: 'entries', label: '📝 Saisie journalière', group: 'core' },
    { key: 'planification', label: '📅 Planification', group: 'core' },
    { key: 'trucks', label: '🚚 Camions', group: 'fleet' },
    { key: 'drivers', label: '👤 Chauffeurs', group: 'fleet' },
    { key: 'reports', label: '📈 Rapports', group: 'core' },
    { key: 'achat', label: '🛒 Achat Local', group: 'erp' },
    { key: 'vente', label: '💰 Vente Client', group: 'erp' },
    { key: 'articles', label: '📦 Articles', group: 'erp' },
    { key: 'settings', label: '⚙️ Paramètres', group: 'system' },
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number]['key'];
export type Permissions = Record<string, boolean>;

// Empty permissions template
export function emptyPermissions(): Permissions {
    const p: Permissions = {};
    PERMISSION_KEYS.forEach(k => p[k.key] = false);
    return p;
}

// Full permissions (for super_admin)
export function fullPermissions(): Permissions {
    const p: Permissions = {};
    PERMISSION_KEYS.forEach(k => p[k.key] = true);
    return p;
}

// ============================================================
// TYPES
// ============================================================

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

export interface Role {
    id: string;
    name: string;
    permissions: Permissions;
    createdAt?: string;
    createdBy?: string;
}

// ============================================================
// PERMISSION CHECK
// ============================================================

export function hasPermission(user: AppUser | null, key: string): boolean {
    if (!user) return false;
    if (user.role === 'super_admin' || user.roleId === 'super_admin') return true;
    return user.permissions?.[key] === true;
}

// ============================================================
// AUTH FUNCTIONS
// ============================================================

export async function signIn(email: string, password: string): Promise<AppUser> {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const profile = await getUserProfile(cred.user.uid);
    if (!profile) throw new Error('Profil utilisateur introuvable');
    return profile;
}

export async function signOut(): Promise<void> {
    await firebaseSignOut(auth);
}

export function onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return firebaseOnAuthStateChanged(auth, callback);
}

// ============================================================
// USER PROFILE FUNCTIONS
// ============================================================

export async function getUserProfile(uid: string): Promise<AppUser | null> {
    const snap = await getDoc(doc(db, COLLECTIONS.users, uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    const profile = { uid, ...data } as AppUser;
    console.log('[Auth] getUserProfile:', uid, 'driverId=', profile.driverId, 'camionId=', profile.camionId, 'role=', profile.role);
    return profile;
}

export async function getAllUsers(): Promise<AppUser[]> {
    const snap = await getDocs(collection(db, COLLECTIONS.users));
    return snap.docs.map(d => d.data() as AppUser);
}

export async function updateDisplayName(uid: string, displayName: string): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.users, uid), { displayName });
}

/**
 * Update user's role + permissions (matching web app signature)
 */
export async function updateUserRole(
    uid: string,
    roleId: string,
    roleName: string,
    permissions: Permissions
): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.users, uid), {
        roleId,
        roleName,
        role: roleId === 'super_admin' ? 'super_admin' : 'custom',
        permissions,
    });
}

/**
 * Update only user's permissions (individual toggle changes)
 */
export async function updateUserPermissions(uid: string, permissions: Permissions): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.users, uid), { permissions });
}

// ============================================================
// ROLES CRUD (Firestore roles collection)
// ============================================================

export async function getAllRoles(): Promise<Role[]> {
    const snap = await getDocs(collection(db, COLLECTIONS.roles));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Role));
}

export async function getRoleById(roleId: string): Promise<Role | null> {
    const snap = await getDoc(doc(db, COLLECTIONS.roles, roleId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Role;
}

export async function createRole(name: string, permissions: Permissions): Promise<Role> {
    const id = 'role_' + Date.now();
    const role: Role = {
        id,
        name,
        permissions: permissions || emptyPermissions(),
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.uid || 'mobile',
    };
    await setDoc(doc(db, COLLECTIONS.roles, id), role);
    return role;
}

export async function updateRole(roleId: string, name: string, permissions: Permissions): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.roles, roleId), { name, permissions });
}

export async function deleteRole(roleId: string): Promise<void> {
    const { deleteDoc: delDoc } = await import('firebase/firestore');
    await delDoc(doc(db, COLLECTIONS.roles, roleId));
}
