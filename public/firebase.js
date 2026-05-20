// firebase.js

import { initializeApp }
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
  onAuthStateChanged,
  signOut
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const firebaseConfig = {

  apiKey: "AIzaSyClhxuoGf7ELHD0srUBUPyQM6_CvYNafIE",

  authDomain: "dpgnotes.firebaseapp.com",

  projectId: "dpgnotes",

  storageBucket: "dpgnotes.firebasestorage.app",

  messagingSenderId: "910494426039",

  appId: "1:910494426039:web:adeae5315caaf846c43e32"
};

const app = initializeApp(firebaseConfig);

/* ---------- SERVICES ---------- */

const auth = getAuth(app);

const db = getFirestore(app);

/* ---------- PROVIDERS ---------- */

const googleProvider =
  new GoogleAuthProvider();

const githubProvider =
  new GithubAuthProvider();

/* ---------- EXPORTS ---------- */

export {

  auth,
  db,

  googleProvider,
  githubProvider,

  onAuthStateChanged,
  signOut,

  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp
};