/**
 * Firebase Configuration
 * Same project as the web app: transportmanagement-9e6eb
 * Includes Auth with AsyncStorage persistence for React Native
 */
import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
} from 'firebase/firestore';
import {
    initializeAuth,
    // @ts-ignore — available at runtime in firebase v10.12+
    getReactNativePersistence,
} from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import {
    getDatabase,
    ref as dbRef,
    push as dbPush,
    set as dbSet,
    onValue,
    onChildAdded,
    serverTimestamp as rtdbTimestamp,
    query as rtdbQuery,
    orderByChild,
    limitToLast,
} from 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyAKcCDbEDa-Pt-tpuM7MkXHiPb-Xarvuns",
    authDomain: "transportmanagement-9e6eb.firebaseapp.com",
    databaseURL: "https://transportmanagement-9e6eb-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "transportmanagement-9e6eb",
    storageBucket: "transportmanagement-9e6eb.firebasestorage.app",
    messagingSenderId: "90479889953",
    appId: "1:90479889953:web:78f475e7bf658021ccdd60",
    measurementId: "G-4888WV1R7J"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// Initialize Auth with AsyncStorage persistence (fixes the warning)
const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export {
    app,
    auth,
    db,
    rtdb,
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    // Realtime DB
    dbRef,
    dbPush,
    dbSet,
    onValue,
    onChildAdded,
    rtdbTimestamp,
    rtdbQuery,
    orderByChild,
    limitToLast,
};
