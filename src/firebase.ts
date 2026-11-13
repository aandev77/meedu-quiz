
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDqjAGuvhgdNZDaMnDClH5bExVZUCr0uoU",
  authDomain: "meedu-quiz.firebaseapp.com",
  projectId: "meedu-quiz",
  storageBucket: "meedu-quiz.firebasestorage.app",
  messagingSenderId: "94098732456",
  appId: "1:94098732456:web:2cd0376e04fa2d6a7f199d",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Firestore Database
export const db = getFirestore(app);
