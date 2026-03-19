import { auth, provider, signInWithPopup } from "./firebase.js";

$(function () {
    $("#googleLoginBtn").on("click", async function () {
        try {
            const result = await signInWithPopup(auth, provider);
            const idToken = await result.user.getIdToken();

            $.ajax({
                url: "/auth/google/login",
                method: "POST",
                contentType: "application/json",
                xhrFields: { withCredentials: true },
                data: JSON.stringify({ idToken }),
                success: function (data) {
                    console.log("google login response =", data);

                    if (data.success) {
                        window.location.href = data.redirectUrl || "/home";
                    } else {
                        alert(data.message || "登入失敗");
                    }
                },
                error: function () {
                    alert("登入請求失敗");
                }
            });

        } catch (e) {
            console.error("google popup error =", e);
            alert("Google 登入失敗");
        }
    });
});