import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA6gE3Tlb97Gb6qLuhccu0EXdQnj_nVNcY",
  authDomain: "anime-travel-website.firebaseapp.com",
  projectId: "anime-travel-website",
  storageBucket: "anime-travel-website.firebasestorage.app",
  messagingSenderId: "756988685588",
  appId: "1:756988685588:web:7f13d7c3f1f507f7dba601"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider, signInWithPopup, signOut };