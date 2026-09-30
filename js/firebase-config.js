// Koneksi terpusat Firebase v10 via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

  const firebaseConfig = {

    apiKey: "AIzaSyDVCssA6fmzFy0bGJxPZBXuJ09YSp9OZvI",

    authDomain: "elola-6c44b.firebaseapp.com",

    projectId: "elola-6c44b",

    storageBucket: "elola-6c44b.firebasestorage.app",

    messagingSenderId: "567454588144",

    appId: "1:567454588144:web:ba681dd059471f459a3635",

    measurementId: "G-T293NLPT00"

  };



export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
console.log("Firebase terhubung");