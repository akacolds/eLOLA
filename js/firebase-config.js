
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyDVCssA6fmzFy0bGJxPZBXuJ09YSp9OZvI",
    authDomain: "elola-6c44b.firebaseapp.com",
    projectId: "elola-6c44b",
    storageBucket: "elola-6c44b.firebasestorage.app",
    messagingSenderId: "567454588144",
    appId: "1:567454588144:web:ba681dd059471f459a3635",
    measurementId: "G-T293NLPT00"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
