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


$(function () {
    const $goRegisterBtn = $("#goRegisterBtn");
    const $authCard = $("#authCard");
    const $loginFormPanel = $("#loginFormPanel");
    const $loginImagePanel = $("#loginImagePanel");

    if ($goRegisterBtn.length) {
        $goRegisterBtn.on("click", function (e) {
            e.preventDefault();

            const targetUrl = $(this).attr("href");

            $authCard.addClass("card-animate card-fade");
            $loginFormPanel.addClass("panel-animate slide-out-right");
            $loginImagePanel.addClass("panel-animate slide-out-left");

            setTimeout(function () {
                window.location.href = targetUrl;
            }, 600);
        });
    }
    
    const $goLoginBtn = $("#goLoginBtn");
    const $registerFormPanel = $("#registerFormPanel");
    const $registerImagePanel = $("#registerImagePanel");

    if ($goLoginBtn.length) {
        $goLoginBtn.on("click", function (e) {
            e.preventDefault();

            const targetUrl = $(this).attr("href");

            $authCard.addClass("card-animate card-fade");
            $registerImagePanel.addClass("panel-animate slide-out-right");
            $registerFormPanel.addClass("panel-animate slide-out-left");

            setTimeout(function () {
                window.location.href = targetUrl;
            }, 600);
        });
    }
});


