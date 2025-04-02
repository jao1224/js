import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa Firestore
const db = getFirestore(app);

// Inicializa Auth com persistência
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Realiza autenticação anônima
const initAuth = async () => {
  try {
    const { signInAnonymously } = await import('firebase/auth');
    const userCredential = await signInAnonymously(auth);
    console.log('Autenticação anônima realizada com sucesso:', userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error('Erro na autenticação anônima:', error.code, error.message);
    if (error.code === 'auth/configuration-not-found') {
      console.warn('A autenticação anônima não está habilitada no console do Firebase');
    }
    return null;
  }
};

// Inicia a autenticação
initAuth().then(user => {
  if (user) {
    console.log('Usuário autenticado:', user.uid);
  } else {
    console.log('Usuário não autenticado. Algumas funcionalidades podem estar indisponíveis.');
  }
});

export { db, auth }; 