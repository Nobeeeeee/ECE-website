import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Web app's Firebase configuration for ECE Department Portal
const firebaseConfig = {
  apiKey: "AIzaSyA3macK0x86at5gOnMvX2dIGGXhLoBaKGk",
  authDomain: "ece-department-portal-15e6c.firebaseapp.com",
  projectId: "ece-department-portal-15e6c",
  storageBucket: "ece-department-portal-15e6c.firebasestorage.app",
  messagingSenderId: "442556208358",
  appId: "1:442556208358:web:e6a7fdb7368f39d020d727"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
