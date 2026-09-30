// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";

// Konfigurasi Firebase proyek kamu
const firebaseConfig = {
  apiKey: "AIzaSyDVCssA6fmzFy0bGJxPZBXuJ09YSp9OZvI",
  authDomain: "elola-6c44b.firebaseapp.com",
  projectId: "elola-6c44b",
  storageBucket: "elola-6c44b.firebasestorage.app",
  messagingSenderId: "567454588144",
  appId: "1:567454588144:web:ba681dd059471f459a3635",
  measurementId: "G-T293NLPT00"
};

// Inisialisasi Firebase App
export const app = initializeApp(firebaseConfig);

// Inisialisasi Layanan
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);