/**
 * Ideal Coaching Center - Firebase Configuration & Initialization
 * 
 * Instructions for User / Deployment:
 * 1. Go to Firebase Console (https://console.firebase.google.com/)
 * 2. Create or select your Firebase project: "ideal-coaching-center"
 * 3. Register a Web App and copy your firebaseConfig credentials below.
 * 4. Enable "Authentication" (Email/Password provider enabled).
 * 5. Enable "Cloud Firestore" in production or test mode.
 * 6. (Optional) Enable "Firebase Storage" for file attachments.
 */

const firebaseConfig = {
  apiKey: "AIzaSyARqea0WQN_FGD9Vy5MntdPct1pCFHBCwA",
  authDomain: "ideal-coaching-center-cec5a.firebaseapp.com",
  projectId: "ideal-coaching-center-cec5a",
  storageBucket: "ideal-coaching-center-cec5a.firebasestorage.app",
  messagingSenderId: "497783500288",
  appId: "1:497783500288:web:d342b6d826f9696607f2e5"
};

// Check if credentials have been replaced with real project keys
function isFirebaseConfigured() {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey.startsWith("AIza") &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId.length > 0
  );
}

window.IDEAL_FIREBASE_CONFIG = firebaseConfig;
window.isFirebaseConfigured = isFirebaseConfigured;
