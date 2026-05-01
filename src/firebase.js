// ─── Firebase Cloud Backend for NEXUS LEARN ─────────────────────────────────
import { initializeApp } from "firebase/app";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as _fbSignOut,
    onAuthStateChanged,
} from "firebase/auth";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    deleteDoc,
    collection,
    getDocs,
} from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/** Create a new Firebase Auth account. Returns the UserCredential. */
export const fbCreateUser = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password);

/** Sign in with email + password. Returns the UserCredential. */
export const fbSignIn = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

/** Sign out the current user. */
export const fbSignOut = () => _fbSignOut(auth);

/** Subscribe to auth state changes. Returns unsubscribe fn. */
export const onAuth = (cb) => onAuthStateChanged(auth, cb);

// ─── Firestore user helpers ───────────────────────────────────────────────────

const userRef = (email) => doc(db, "users", email.toLowerCase());

/**
 * Save (create or overwrite) a user document in Firestore.
 * Call after sign-up and after every profile update.
 */
export async function saveUser(userData) {
    try {
        await setDoc(userRef(userData.email), userData, { merge: true });
    } catch (e) {
        console.warn("Firestore saveUser failed, falling back to localStorage:", e);
        localStorage.setItem(`nx_user:${userData.email.toLowerCase()}`, JSON.stringify(userData));
    }
}

/**
 * Fetch a user document by email.
 * Returns the plain JS object, or null if not found.
 */
export async function getUser(email) {
    try {
        const snap = await getDoc(userRef(email));
        if (snap.exists()) return snap.data();
    } catch (e) {
        console.warn("Firestore getUser failed, falling back to localStorage:", e);
    }
    const local = localStorage.getItem(`nx_user:${email.toLowerCase()}`);
    return local ? JSON.parse(local) : null;
}

/**
 * Delete a user document from Firestore.
 * (Does NOT delete the Firebase Auth account — requires Admin SDK for that.)
 */
export async function deleteUserDoc(email) {
    try {
        await deleteDoc(userRef(email));
    } catch (e) {
        console.warn("Firestore deleteUserDoc failed, falling back to localStorage:", e);
    }
    localStorage.removeItem(`nx_user:${email.toLowerCase()}`);
}

/**
 * Get every user document as an array.
 * Used by the AdminPanel to list all students.
 */
export async function getAllUsers() {
    let users = [];
    try {
        const snap = await getDocs(collection(db, "users"));
        users = snap.docs.map((d) => d.data());
    } catch (e) {
        console.warn("Firestore getAllUsers failed, falling back to localStorage:", e);
    }
    
    // Also include any users saved ONLY in local storage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("nx_user:")) {
            try {
                const u = JSON.parse(localStorage.getItem(key));
                if (!users.some(existing => existing.email === u.email)) {
                    users.push(u);
                }
            } catch (err) {}
        }
    }
    return users;
}
