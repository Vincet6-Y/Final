$(function () {

    const $memberDropdownBtn = $("#memberDropdownBtn");
    const $memberDropdownMenu = $("#memberDropdownMenu");
    const $memberDropdownArrow = $("#memberDropdownArrow");

    function openDropdown() {
        $memberDropdownMenu
            .removeClass("opacity-0 -translate-y-2 pointer-events-none")
            .addClass("opacity-100 translate-y-0");

        $memberDropdownArrow.addClass("rotate-180");
    }

    function closeDropdown() {
        $memberDropdownMenu
            .addClass("opacity-0 -translate-y-2 pointer-events-none")
            .removeClass("opacity-100 translate-y-0");

        $memberDropdownArrow.removeClass("rotate-180");
    }

    if ($memberDropdownBtn.length && $memberDropdownMenu.length) {

        $memberDropdownBtn.on("click", function (e) {
            e.stopPropagation();

            const isClosed = $memberDropdownMenu.hasClass("pointer-events-none");

            if (isClosed) {
                openDropdown();
            } else {
                closeDropdown();
            }
        });

        $(document).on("click", function (e) {
            if (
                !$memberDropdownBtn.is(e.target) &&
                $memberDropdownBtn.has(e.target).length === 0 &&
                !$memberDropdownMenu.is(e.target) &&
                $memberDropdownMenu.has(e.target).length === 0
            ) {
                closeDropdown();
            }
        });
    }

});
