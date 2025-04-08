import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { initializeAuth, getReactNativePersistence, signInAnonymously } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCztKxPyQ8pC_hH2CnBMzIjRDb49avOKKk",
  authDomain: "todolist-2f767.firebaseapp.com",
  databaseURL: "https://todolist-2f767-default-rtdb.firebaseio.com",
  projectId: "todolist-2f767",
  storageBucket: "todolist-2f767.firebasestorage.app",
  messagingSenderId: "722219746570",
  appId: "1:722219746570:web:72506a134a71c973dba6f3",
  measurementId: "G-1ZCRG1B2Y4"
};

// Inicializa o Firebase apenas se ainda não foi inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Inicializa Auth com persistência
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Inicializa Realtime Database
const database = getDatabase(app);

// Realiza autenticação anônima
const initAuth = async () => {
  try {
    const userCredential = await signInAnonymously(auth);
    console.log('Autenticação anônima realizada com sucesso:', userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error('Erro na autenticação anônima:', error.code, error.message);
    return null;
  }
};

// Inicia a autenticação
initAuth();

// Exporta as instâncias necessárias
export { app, auth, database }; 