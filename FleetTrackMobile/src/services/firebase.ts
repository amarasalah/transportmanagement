/**
 * Firebase Configuration
 * Same project as the web app: managementsirep
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
const firebaseConfig = {
  apiKey: "AIzaSyAKcCDbEDa-Pt-tpuM7MkXHiPb-Xarvuns",
  authDomain: "transportmanagement-9e6eb.firebaseapp.com",
  projectId: "transportmanagement-9e6eb",
  storageBucket: "transportmanagement-9e6eb.firebasestorage.app",
  messagingSenderId: "90479889953",
  appId: "1:90479889953:web:78f475e7bf658021ccdd60",
  measurementId: "G-4888WV1R7J"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export {
    app,
    db,
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
};
