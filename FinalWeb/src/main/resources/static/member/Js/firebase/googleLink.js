import { auth, provider, signInWithPopup, signOut } from "./firebase.js";

$(function () {

    $("#googleLinkBtn").on("click", async function () {
        try {
            const result = await signInWithPopup(auth, provider);
            const idToken = await result.user.getIdToken();

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

        } catch (e) {
            console.error("google link error =", e);
            alert("Google 綁定失敗");
        }
    });

    $("#unlinkGoogleBtn").on("click", async function () {
        try {
            $.ajax({
                url: "/auth/google/unlink",
                method: "POST",
                xhrFields: { withCredentials: true },
                success: async function (data) {
                    if (!data.success) {
                        alert(data.message || "Google 解除綁定失敗");
                        return;
                    }

                    await signOut(auth);

                    alert(data.message || "Google 已解除綁定");
                    location.reload();
                },
                error: function () {
                    alert("解除綁定請求失敗");
                }
            });

        } catch (e) {
            console.error("google unlink error =", e);
            alert("Google 解除綁定失敗");
        }
    });

});