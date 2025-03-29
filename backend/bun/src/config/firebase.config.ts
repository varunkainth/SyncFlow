// src/config/firebase.ts

import admin from 'firebase-admin';

// Load environment variables if you're using dotenv
// import dotenv from 'dotenv';
// dotenv.config();

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

// Initialize Firestore
const db = admin.firestore();

// Initialize Authentication
const auth = admin.auth();

// Initialize Storage
const storage = admin.storage();

export { admin, db, auth, storage };