
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseOptions, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Função para obter o app do Firebase de forma segura
function getFirebaseApp(): FirebaseApp | null {
  if (firebaseConfig.apiKey) {
    return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  }
  return null;
}

// A instância do app é obtida aqui
const app = getFirebaseApp();

// Os serviços são exportados como funções que retornam a instância do serviço
// Isso garante que eles sejam chamados apenas quando o 'app' já está disponível.
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const storage = app ? getStorage(app) : null;

// A inicialização do Messaging pode falhar se não for um ambiente de navegador seguro (HTTPS)
const messaging = () => {
  if (app && typeof window !== 'undefined' && getMessaging) {
    return getMessaging(app);
  }
  return null;
};

export { app, auth, db, storage, firebaseConfig, getFirebaseApp };
