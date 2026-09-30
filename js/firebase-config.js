// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDVCssA6fmzFy0bGJxPZBXuJ09YSp9OZvI",
  authDomain: "elola-6c44b.firebaseapp.com",
  projectId: "elola-6c44b",
  storageBucket: "elola-6c44b.firebasestorage.app",
  messagingSenderId: "567454588144",
  appId: "1:567454588144:web:ba681dd059471f459a3635",
  measurementId: "G-T293NLPT00"
};

// Inisialisasi Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);