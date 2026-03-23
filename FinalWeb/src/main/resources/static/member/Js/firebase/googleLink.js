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
                                alert(data.message || "Google 綁定失敗");
                                return;
                            }
                            alert(data.message || "Google 綁定成功");
                            location.reload();
                        },
                        error: function () {
                            alert("綁定請求失敗");
                        }
                    });
                });
            })
            .catch(function (e) {
                console.error("google link error =", e);
                alert("Google 綁定失敗");
            });
    });

    $("#unlinkGoogleBtn").on("click", function () {
        $.ajax({
            url: "/auth/google/unlink",
            method: "POST",
            xhrFields: { withCredentials: true },
            success: function (data) {
                if (!data.success) {
                    alert(data.message || "Google 解除綁定失敗");
                    return;
                }
                signOut(auth).then(function () {
                    alert(data.message || "Google 已解除綁定");
                    location.reload();
                });
            },
            error: function () {
                alert("解除綁定請求失敗");
            }
        });
    });

});