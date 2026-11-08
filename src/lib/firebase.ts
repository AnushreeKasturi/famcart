import { getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const alreadyInitialized = getApps().length > 0;
export const app = alreadyInitialized ? getApp() : initializeApp(firebaseConfig);

function createAuth(): FirebaseAuth.Auth {
  if (alreadyInitialized || Platform.OS === 'web') return FirebaseAuth.getAuth(app);
  // getReactNativePersistence only exists in the react-native build of firebase/auth,
  // and the public typings don't declare it, hence the cast.
  const getReactNativePersistence = (FirebaseAuth as any).getReactNativePersistence;
  if (typeof getReactNativePersistence !== 'function') {
    console.warn('getReactNativePersistence missing; login will not survive app restarts.');
    return FirebaseAuth.getAuth(app);
  }
  return FirebaseAuth.initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export const auth = createAuth();
export const db = getFirestore(app);
