$(function () {
    $("#togglePasswdBtn").click(function () {
        const input = $("#passwd");
        const icon = $("#eyeIcon");

        if (input.attr("type") === "password") {
            input.attr("type", "text");
            icon.text("visibility");
        } else {
            input.attr("type", "password");
            icon.text("visibility_off");
        }
    });
});