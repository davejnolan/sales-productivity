import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAWIXaq8z0bhGYr_YJ1XiEWM74psWIKCco",
  authDomain: "salesproductivityruleofeight.firebaseapp.com",
  projectId: "salesproductivityruleofeight",
  storageBucket: "salesproductivityruleofeight.firebasestorage.app",
  messagingSenderId: "754778704913",
  appId: "1:754778704913:web:711d77e70ce56be62ab5b0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
