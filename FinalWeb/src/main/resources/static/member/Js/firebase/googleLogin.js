import { auth, provider, signInWithPopup } from "./firebase.js";

function isLineApp() {
    return /Line/i.test(navigator.userAgent);
}

$(function () {

    // 頁面載入時清掉 openExternalBrowser 參數
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

    // 正常環境的 Google 登入流程
    $("#googleLoginBtn").on("click", function () {

        // 取得網址列中的 redirect 參數
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect') || "";

        signInWithPopup(auth, provider)
            .then(function (result) {
                return result.user.getIdToken().then(function (idToken) {
                    $.ajax({
                        url: "/auth/google/login",
                        method: "POST",
                        contentType: "application/json",
                        xhrFields: { withCredentials: true },
                        // 將 redirect 一起傳給後端
                        data: JSON.stringify({ idToken: idToken, redirect: redirect }),
                        success: function (data) {
                            if (data.success) {
                                sessionStorage.setItem('toastType', 'success');
                                sessionStorage.setItem('toastMessage', 'Google 登入成功');
                                window.location.href = data.redirectUrl || "/home";
                            } else {
                                showToast('error', data.message || "登入失敗");
                            }
                        },
                        error: function () {
                            showToast('error', "登入請求失敗");
                        }
                    });
                });
            })
            .catch(function (e) {
                console.error("google popup error =", e);
                showToast('error', "Google 登入失敗");
            });
    });
});