import { auth, provider, signInWithRedirect, getRedirectResult, signOut } from "./firebase.js";

function isLineApp() {
    return /Line/i.test(navigator.userAgent);
}

function isIGApp() {
    return /Instagram/i.test(navigator.userAgent);
}

$(function () {

    const url = new URL(window.location.href);
    if (url.searchParams.has('openExternalBrowser')) {
        url.searchParams.delete('openExternalBrowser');
        window.history.replaceState({}, '', url.toString());
    }

    if (isLineApp()) {
        $("#googleLoginBtn").off("click").on("click", function () {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('openExternalBrowser', '1');
            window.location.href = currentUrl.toString();
        });
        return;
    }

    if (isIGApp()) {
        $("#googleLoginBtn").off("click").on("click", function () {
            const isIOS = /iPhone|iPad/i.test(navigator.userAgent);
            if (isIOS) {
                showToast('info', '請點右上角 ⋯ 選單，選擇「使用外部瀏覽器開啟」');
            } else {
                showToast('info', '請點右上角 ⋮ 選單，選擇「在瀏覽器中開啟」');
            }
        });
        return;
    }

    // 正常環境的 Google 登入流程
    // ==========================================
// 動作一：出門買票 (綁定在點擊事件上)
// ==========================================
$("#googleLoginBtn").on("click", function () {
    // 1. 取得網址列中的 redirect 參數（例如使用者原本想去 /tour，被攔截來登入）
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect') || "";

    // 2. 🌟 關鍵：因為網頁即將離開，把目的地暫存到瀏覽器記憶體中
    if (redirect) {
        sessionStorage.setItem('pendingGoogleRedirect', redirect);
    }

    // 3. 執行轉址，畫面會直接跳轉到 Google 登入頁面
    signInWithRedirect(auth, provider);
});


// ==========================================
// 動作二：回家收票 (放在全域，網頁一載入就會執行)
// ==========================================
// ⚠️ 絕對不能包在 click 事件裡面！這要在網頁從 Google 跳轉回來、重新載入時自動執行。
getRedirectResult(auth)
    .then(function (result) {
        // 如果 result 裡面有東西，代表使用者剛從 Google 登入成功並跳轉回來了！
        if (result) {
            // 取得 Google 發給我們的身分證 (idToken)
            return result.user.getIdToken().then(function (idToken) {
                
                // 1. 把出門前暫存的目的地拿出來
                const savedRedirect = sessionStorage.getItem('pendingGoogleRedirect') || "";
                
                // 2. 拿出來後就清掉，保持乾淨
                sessionStorage.removeItem('pendingGoogleRedirect');

                // 3. 把 idToken 和目的地，打包送給你的 Java Spring Boot 後端做驗證
                $.ajax({
                    url: "/auth/google/login",
                    method: "POST",
                    contentType: "application/json",
                    xhrFields: { withCredentials: true },
                    data: JSON.stringify({ idToken: idToken, redirect: savedRedirect }),
                    success: function (data) {
                        if (data.success) {
                            // 後端驗證成功，準備進入網站
                            sessionStorage.setItem('toastType', 'success');
                            sessionStorage.setItem('toastMessage', 'Google 登入成功');
                            // 導向後端指定的網址，或預設的首頁
                            window.location.href = data.redirectUrl || "/home";
                        } else {
                            showToast('error', data.message || "登入失敗");
                        }
                    },
                    error: function () {
                        showToast('error', "登入請求失敗，請確認後端伺服器狀態");
                    }
                });
            });
        }
    })
    .catch(function (e) {
        // 如果使用者在 Google 畫面按了取消，或是發生其他錯誤，會在這裡攔截
        console.error("Google 轉址登入發生錯誤 =", e);
        showToast('error', e.code || e.message || "Google 登入失敗");
    });
});