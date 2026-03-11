$(function () {

    function togglePassword(inputId, iconId) {
        const input = $("#" + inputId);
        const icon = $("#" + iconId);

        if (input.attr("type") === "password") {
            input.attr("type", "text");
            icon.text("visibility");
        } else {
            input.attr("type", "password");
            icon.text("visibility_off");
        }
    }

    $("#togglePasswdBtn").click(function () {
        togglePassword("passwd", "eyeIcon");
    });

    $("#toggleRegisterPasswd").click(function () {
        togglePassword("registerPasswd", "registerEyeIcon");
    });

    $("#toggleRegisterConfirmPasswd").click(function () {
        togglePassword("registerConfirmPasswd", "registerConfirmEyeIcon");
    });

});