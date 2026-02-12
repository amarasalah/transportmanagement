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
    apiKey: 'AIzaSyB4SNzrvJfnFlBnByU8cdYXPomxaoBHQB8',
    authDomain: 'managementsirep.firebaseapp.com',
    projectId: 'managementsirep',
    storageBucket: 'managementsirep.firebasestorage.app',
    messagingSenderId: '141121672067',
    appId: '1:141121672067:web:39687e8d5020cd07e31cb6',
    measurementId: 'G-V0B7ZJD2YL',
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
