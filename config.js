// Import the functions you need from the SDKs you need 
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDk5wJdQTLP4d6SPZOWGg4Y2YdGYJoFArY",
  authDomain: "travelwolf-c553b.firebaseapp.com",
  projectId: "travelwolf-c553b",
  storageBucket: "travelwolf-c553b.firebasestorage.app",
  messagingSenderId: "501214336183",
  appId: "1:501214336183:web:37d55ba7aa8fcdd9a22932"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);