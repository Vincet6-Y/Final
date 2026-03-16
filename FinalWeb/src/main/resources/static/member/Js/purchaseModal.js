$(function () {
    const $purchaseDetailModal = $("#purchaseDetailModal");
    const $purchaseDetailBackdrop = $("#purchaseDetailBackdrop");
    const $purchaseDetailPanel = $("#purchaseDetailPanel");
    const $closePurchaseDetailModal = $("#closePurchaseDetailModal");

    function openPurchaseDetailModal(data) {
        $("#purchaseDetailTitle").text(data.title);
        $("#purchaseDetailDate").text(data.date);
        $("#purchaseDetailStatus").text(data.status);
        $("#purchaseDetailPrice").text(data.price);
        $("#purchaseDetailImage").attr("src", data.image);

        const items = JSON.parse(data.items || "[]");
        const $itemsWrap = $("#purchaseDetailItems");
        $itemsWrap.empty();

        if (items.length === 0) {
            $itemsWrap.append(`
                <div class="text-slate-400 text-sm">目前沒有購買品項資料</div>
            `);
        } else {
            items.forEach(function (item) {
                $itemsWrap.append(`
                    <div class="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                        <div class="text-lg font-medium text-slate-100">
                            ${item.name}
                        </div>
                        <div class="text-right">
                            <div class="text-sm text-slate-400 mb-1">小計：</div>
                            <div class="text-base font-semibold text-primary">
                                ${item.subtotal}
                            </div>
                        </div>
                    </div>
                `);
            });
        }

        $purchaseDetailModal
            .removeClass("hidden")
            .css("display", "flex");

        $("body").addClass("overflow-hidden");

        requestAnimationFrame(function () {
            $purchaseDetailBackdrop.removeClass("opacity-0").addClass("opacity-100");
            $purchaseDetailPanel.removeClass("opacity-0 scale-95").addClass("opacity-100 scale-100");
        });
    }

    function closePurchaseDetailModal() {
        $purchaseDetailBackdrop.removeClass("opacity-100").addClass("opacity-0");
        $purchaseDetailPanel.removeClass("opacity-100 scale-100").addClass("opacity-0 scale-95");

        setTimeout(function () {
            $purchaseDetailModal
                .addClass("hidden")
                .css("display", "");

            $("body").removeClass("overflow-hidden");
        }, 300);
    }

    $(".openPurchaseDetailModal").on("click", function () {
        openPurchaseDetailModal({
            title: $(this).data("title"),
            date: $(this).data("date"),
            status: $(this).data("status"),
            price: $(this).data("price"),
            image: $(this).data("image"),
            items: $(this).attr("data-items")
        });
    });

    $closePurchaseDetailModal.on("click", function () {
        closePurchaseDetailModal();
    });

    $purchaseDetailBackdrop.on("click", function () {
        closePurchaseDetailModal();
    });

    $(document).on("keydown", function (e) {
        if (e.key === "Escape" && $purchaseDetailModal.is(":visible")) {
            closePurchaseDetailModal();
        }
    });
});