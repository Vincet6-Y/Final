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

document.getElementById("googleLinkBtn")?.addEventListener("click", async () => {
try {
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();

    const response = await fetch("/auth/google/link", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({ idToken })
    });

    const data = await response.json();

    if (!data.success) {
    alert(data.message || "Google 綁定失敗");
    return;
    }

    alert(data.message || "Google 綁定成功");
    window.location.reload();
} catch (e) {
    console.error(e);
    alert("Google 綁定失敗");
}
});

document.getElementById("unlinkGoogleBtn")?.addEventListener("click", async () => {
try {
    const response = await fetch("/auth/google/unlink", {
    method: "POST",
    credentials: "include"
    });

    const data = await response.json();

    if (!data.success) {
    alert(data.message || "Google 解除綁定失敗");
    return;
    }

    await signOut(auth);

    alert(data.message || "Google 已解除綁定");
    window.location.reload();
} catch (e) {
    console.error(e);
    alert("Google 解除綁定失敗");
}
});
