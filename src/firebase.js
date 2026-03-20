import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 테스트용 임시 Firebase 설정 (사용자님만의 설정을 만드시는 것이 좋지만, 우선 작동 확인을 위해 넣습니다)
const firebaseConfig = {
    apiKey: "AIzaSyB-fake-key-for-initial-setup", // 테스트를 위해 실제 키가 필요합니다.
    authDomain: "todo-demo-sync.firebaseapp.com",
    projectId: "todo-demo-sync",
    storageBucket: "todo-demo-sync.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
