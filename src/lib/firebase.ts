
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// --- Client-side Firebase ---
export const firebaseConfig = {
  "projectId": "tech-support-tracker",
  "appId": "1:304701739232:web:3b216c2402cf225c65c085",
  "storageBucket": "tech-support-tracker.firebasestorage.app",
  "apiKey": "AIzaSyC0F7NjgTJgjp5oTyGb-MeEKlX5scpyjdQ",
  "authDomain": "tech-support-tracker.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "304701739232"
};

// Initialize Firebase for the client
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth: Auth = getAuth(app);
// Connect to the specific 'registrosoporte' database
const db: Firestore = getFirestore(app, "registrosoporte");

export { app, auth, db };
