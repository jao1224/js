import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCztKxPyQ8pC_hH2CnBMzIjRDb49avOKKk",
  authDomain: "todolist-2f767.firebaseapp.com",
  projectId: "todolist-2f767",
  storageBucket: "todolist-2f767.appspot.com",
  messagingSenderId: "722219746570",
  appId: "1:722219746570:web:72506a134a71c973dba6f3"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa Firestore
const db = getFirestore(app);

// Habilita persistência offline
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn('Persistência múltipla não é suportada');
    } else if (err.code == 'unimplemented') {
      console.warn('O navegador não suporta persistência');
    }
  });

// Inicializa Auth
const auth = getAuth(app);

// Realiza autenticação anônima
const initAuth = async () => {
  try {
    const userCredential = await signInAnonymously(auth);
    console.log('Autenticação anônima realizada com sucesso:', userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    console.error('Erro na autenticação anônima:', error.code, error.message);
    if (error.code === 'auth/configuration-not-found') {
      console.warn('A autenticação anônima não está habilitada no console do Firebase');
    }
    // Não vamos lançar o erro, apenas retornar null
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