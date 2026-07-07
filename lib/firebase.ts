
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 제공된 Firebase 프로젝트 설정 정보
export const firebaseConfig = {
  apiKey: "AIzaSyD_ZiEdVc94-p6MVOqRi5AKi1gsEou0rpA",
  authDomain: "peer-bonus-60c3c.firebaseapp.com",
  projectId: "peer-bonus-60c3c",
  storageBucket: "peer-bonus-60c3c.firebasestorage.app",
  messagingSenderId: "194476834112",
  appId: "1:194476834112:web:235e074f4fddac7cdacea5",
  measurementId: "G-JHPKYGSHKS"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
