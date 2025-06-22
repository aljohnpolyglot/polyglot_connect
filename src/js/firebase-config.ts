// src/js/firebase-config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your actual Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyC5k_WocF2E9fJ_rYiUVw-hUq5UYfF1QxI",
    authDomain: "polyglot-connect-ffdcc.firebaseapp.com",
    projectId: "polyglot-connect-ffdcc",
    storageBucket: "polyglot-connect-ffdcc.firebasestorage.app", // <<< THE NEW, CORRECT URL
    messagingSenderId: "724893488450",
    appId: "1:724893488450:web:51b944b94a7c66e3fbe4db",
    measurementId: "G-CQR8RBH78K"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services FOR THE WHOLE APP
export const auth = getAuth(app);
export const db = getFirestore(app); // We'll need the database soon!