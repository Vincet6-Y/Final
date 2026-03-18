$(function () {
    const $openAccountModal = $("#openAccountModal");
    const $accountModal = $("#accountModal");
    const $closeAccountModal = $("#closeAccountModal");
    const $accountModalBackdrop = $("#accountModalBackdrop");
    const $memberMenu = $("#memberMenu");

    function openModal() {
        $accountModal.removeClass("hidden");
        $("body").addClass("overflow-hidden");
    }

    function closeModal() {
        $accountModal.addClass("hidden");
        $("body").removeClass("overflow-hidden");
    }

    if ($openAccountModal.length) {
        $openAccountModal.on("click", function () {
            $memberMenu.addClass("hidden");
            openModal();
        });
    }

    if ($closeAccountModal.length) {
        $closeAccountModal.on("click", function () {
            closeModal();
        });
    }

    if ($accountModalBackdrop.length) {
        $accountModalBackdrop.on("click", function () {
            closeModal();
        });
    }

    $(document).on("keydown", function (e) {
        if (e.key === "Escape") {
            closeModal();
        }
    });

    $(".accordion-content").hide();

    $(".accordion-btn").on("click", function () {
        const $button = $(this);
        const $content = $button.next(".accordion-content");
        const $icon = $button.find(".accordion-icon");
        const isVisible = $content.is(":visible");

        $(".accordion-content").not($content).stop(true, true).slideUp(200);
        $(".accordion-icon").not($icon).text("expand_more");

        if (isVisible) {
            $content.stop(true, true).slideUp(200);
            $icon.text("expand_more");
        } else {
            $content.stop(true, true).slideDown(200);
            $icon.text("expand_less");
        }
    });
});