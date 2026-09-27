import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import dotenv from "dotenv";

dotenv.config();

/**
 * Firebase Admin SDK Initialization
 * Initializes administrative access to Firestore and Firebase Storage.
 */
let adminApp;

if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : null;

  if (serviceAccount) {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    console.log("🔥 Firebase Admin SDK initialized with Service Account Key.");
  } else {
    adminApp = initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || "ece-website-studynotes",
    });
    console.log("🔥 Firebase Admin SDK initialized with default project configuration.");
  }
} else {
  adminApp = getApps()[0];
}

export const adminDb = getFirestore(adminApp);
export const adminStorage = getStorage(adminApp);
export default adminApp;
