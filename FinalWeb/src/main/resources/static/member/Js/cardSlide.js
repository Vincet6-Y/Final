$(function () {
    $("#showRegisterBtn").on("click", function () {
        $("#loginFormFace, #loginHeroFace").removeClass("active");

        setTimeout(function () {
            $("#authStage").addClass("register-mode");
            $("#registerFormFace, #registerHeroFace").addClass("active");
        }, 250);
    });

    $("#showLoginBtn").on("click", function () {
        $("#registerFormFace, #registerHeroFace").removeClass("active");

        setTimeout(function () {
            $("#authStage").removeClass("register-mode");
            $("#loginFormFace, #loginHeroFace").addClass("active");
        }, 250);
    });
});