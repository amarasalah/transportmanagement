/**
 * Firebase Configuration
 * Same project as the web app: transportmanagement-9e6eb
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

export {
    app,
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
