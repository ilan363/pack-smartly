import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ??
    "AIzaSyDk5wJdQTLP4d6SPZOWGg4Y2YdGYJoFArY",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "travelwolf-c553b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "travelwolf-c553b",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ??
    "travelwolf-c553b.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "501214336183",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ??
    "1:501214336183:web:37d55ba7aa8fcdd9a22932",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
