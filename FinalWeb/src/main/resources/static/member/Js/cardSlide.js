$(function () {
    function setSwitchState(isRegister) {
        $("#mobileShowLoginBtn").toggleClass("active", !isRegister);
        $("#mobileShowRegisterBtn").toggleClass("active", isRegister);
    }

    function updateAuthStageHeight() {
        const isMobile = window.matchMedia("(max-width: 767px)").matches;
        const $stage = $("#authStage");

        if (isMobile) {
            $stage.css("--auth-stage-height", "auto");
            return;
        }

        const $activeForm = $(".card-face.active .form-content");

        if ($activeForm.length) {
            const height = $activeForm.outerHeight(true);
            $stage.css("--auth-stage-height", `${height + 12}px`);
        }
    }

    function switchDesktop(isRegister) {
        const currentScrollY = window.scrollY;

        if (isRegister) {
            $("#loginFormFace, #loginHeroFace").removeClass("active");
            setTimeout(function () {
                $("#authStage").addClass("register-mode");
                $("#registerFormFace, #registerHeroFace").addClass("active");
                updateAuthStageHeight();
                window.scrollTo(0, currentScrollY);
            }, 250);
        } else {
            $("#registerFormFace, #registerHeroFace").removeClass("active");
            setTimeout(function () {
                $("#authStage").removeClass("register-mode");
                $("#loginFormFace, #loginHeroFace").addClass("active");
                updateAuthStageHeight();
                window.scrollTo(0, currentScrollY);
            }, 250);
        }
    }

    function switchMobile(isRegister) {
        if (isRegister) {
            $("#loginFormFace").removeClass("active");
            $("#registerFormFace").addClass("active");
        } else {
            $("#registerFormFace").removeClass("active");
            $("#loginFormFace").addClass("active");
        }

        setSwitchState(isRegister);
    }

    function switchAuthMode(isRegister) {
        const isMobile = window.matchMedia("(max-width: 767px)").matches;

        if (isMobile) {
            switchMobile(isRegister);
        } else {
            switchDesktop(isRegister);
        }
    }

    $("#showRegisterBtn, #mobileShowRegisterBtn").on("click", function (e) {
        e.preventDefault();
        switchAuthMode(true);
    });

    $("#showLoginBtn, #mobileShowLoginBtn").on("click", function (e) {
        e.preventDefault();
        switchAuthMode(false);
    });

    $(window).on("load resize", function () {
        updateAuthStageHeight();
    });

    setTimeout(updateAuthStageHeight, 100);

    const isMobileOnLoad = window.matchMedia("(max-width: 767px)").matches;
    if (isMobileOnLoad) {
        const isRegisterActive = $("#registerFormFace").hasClass("active");
        setSwitchState(isRegisterActive);
    }
});