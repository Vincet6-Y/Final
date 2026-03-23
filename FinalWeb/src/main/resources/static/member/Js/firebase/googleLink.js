import { auth, provider, signInWithPopup, signOut } from "./firebase.js";

$(function () {

    $("#googleLinkBtn").on("click", function () {
        signInWithPopup(auth, provider)
            .then(function (result) {
                return result.user.getIdToken().then(function (idToken) {
                    $.ajax({
                        url: "/auth/google/link",
                        method: "POST",
                        contentType: "application/json",
                        xhrFields: { withCredentials: true },
                        data: JSON.stringify({ idToken }),
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
            })
            .catch(function (e) {
                console.error("google link error =", e);
                showToast('error', "Google 綁定失敗");
            });
    });

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