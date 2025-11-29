import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyA4sQav5EeZowQKRya14xeG9Lj3TyMQdM4",
    authDomain: "meijiasha-64de6.firebaseapp.com",
    projectId: "meijiasha-64de6",
    storageBucket: "meijiasha-64de6.firebasestorage.app",
    messagingSenderId: "732275424686",
    appId: "1:732275424686:web:9e1349c421503f75da5c3f",
    measurementId: "G-07JZNDTJN7",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
export const analytics = getAnalytics(app);
