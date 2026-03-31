import { auth, provider, signInWithRedirect, getRedirectResult, signOut } from "./firebase.js";

$(function () {// ==========================================
    // 動作一：出門驗證 (點擊綁定按鈕)
    // ==========================================
    $("#googleLinkBtn").on("click", function () {
        // 🌟 關鍵：記住這次跳轉是為了「綁定帳號」
        sessionStorage.setItem('pendingGoogleLink', 'true');

        // 執行跳轉
        signInWithRedirect(auth, provider);
    });

    // ==========================================
    // 動作二：回家收票 (處理 Google 跳轉回來的結果)
    // ==========================================
    getRedirectResult(auth)
        .then(function (result) {
            // 如果有回傳結果，代表從 Google 驗證回來了
            if (result) {
                // 檢查是否為「綁定」的跳轉
                const isPendingLink = sessionStorage.getItem('pendingGoogleLink');

                if (isPendingLink === 'true') {
                    // 拿出來後就清掉，保持乾淨
                    sessionStorage.removeItem('pendingGoogleLink');

                    // 取得 Token 並傳給後端
                    return result.user.getIdToken().then(function (idToken) {
                        $.ajax({
                            url: "/auth/google/link",
                            method: "POST",
                            contentType: "application/json",
                            xhrFields: { withCredentials: true },
                            data: JSON.stringify({ idToken: idToken }),
                            success: function (data) {
                                if (!data.success) {
                                    showToast('error', data.message || "Google 綁定失敗");
                                    return;
                                }
                                showToast('success', data.message || "Google 綁定成功");
                                setTimeout(function () {
                                    location.reload();
                                }, 1500);
                            },
                            error: function () {
                                showToast('error', "綁定請求失敗");
                            }
                        });
                    });
                }
            }
        })
        .catch(function (e) {
            console.error("google link error =", e);
            // 發生錯誤時也要記得清除標記
            sessionStorage.removeItem('pendingGoogleLink');
            showToast('error', e.code || e.message || "Google 綁定失敗");
        });

    // ==========================================
    // 解除綁定 (維持原樣，不牽涉跳轉)
    // ==========================================
    $("#unlinkGoogleBtn").on("click", function () {
        $.ajax({
            url: "/auth/google/unlink",
            method: "POST",
            xhrFields: { withCredentials: true },
            success: function (data) {
                if (!data.success) {
                    showToast('error', data.message || "Google 解除綁定失敗");
                    return;
                }
                signOut(auth).then(function () {
                    showToast('success', data.message || "Google 已解除綁定");
                    setTimeout(function () {
                        location.reload();
                    }, 1500);
                });
            },
            error: function () {
                showToast('error', "解除綁定請求失敗");
            }
        });
    });
});