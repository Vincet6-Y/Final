import { auth, provider, signInWithPopup, signOut } from "./firebase.js";

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
    $("#googleLoginBtn").on("click", function () {
        signInWithPopup(auth, provider)
            .then(function (result) {
                return result.user.getIdToken().then(function (idToken) {
                    $.ajax({
                        url: "/auth/google/login",
                        method: "POST",
                        contentType: "application/json",
                        xhrFields: { withCredentials: true },
                        data: JSON.stringify({ idToken }),
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
                showToast('error', e.code || e.message || "Google 登入失敗");
            });
    });
});