$(function () {

    const $toast = $("#toast");

    if ($toast.length > 0) {

        $toast.addClass("transition-all duration-300 ease-in-out");

        setTimeout(function () {
            $toast.removeClass("opacity-0 -translate-y-6 scale-95")
                  .addClass("opacity-100 translate-y-0 scale-100");
        }, 10);

        setTimeout(function () {
            $toast.removeClass("opacity-100 translate-y-0 scale-100")
                  .addClass("opacity-0 -translate-y-6 scale-95");

            setTimeout(function () {
                $toast.remove();
            }, 500);
        }, 2500);

    }

});