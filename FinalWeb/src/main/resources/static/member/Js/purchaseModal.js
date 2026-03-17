$(function () {
    const $purchaseDetailModal = $("#purchaseDetailModal");
    const $purchaseDetailBackdrop = $("#purchaseDetailBackdrop");
    const $purchaseDetailPanel = $("#purchaseDetailPanel");
    const $closePurchaseDetailModal = $("#closePurchaseDetailModal");
    const $modalActionBtn = $("#modalActionBtn");

    function openPurchaseDetailModal(data) {
        $("#purchaseDetailTitle").text(data.title);
        $("#purchaseDetailDate").text(data.date);
        $("#purchaseDetailStatus").text(data.status);
        $("#purchaseDetailPrice").text(data.price);
        $("#purchaseDetailImage").attr("src", data.image);

        // 🌟 判斷狀態改變按鈕行為
        if (data.status === '未付款') {
            $modalActionBtn.text("前往結帳付款");
            $modalActionBtn.off('click').on('click', function () {
                window.location.href = '/payment?orderId=' + data.orderId;
            });
        } else {
            $modalActionBtn.text("查看票券與行程");
            $modalActionBtn.off('click').on('click', function () {
                window.location.href = '/payment/paymentsuccess?orderId=' + data.orderId;
            });
        }

        // 🌟 直接接收陣列，不需再 JSON.parse
        const items = data.items || [];
        const $itemsWrap = $("#purchaseDetailItems");
        $itemsWrap.empty();

        if (items.length === 0) {
            $itemsWrap.append(`
                <div class="text-slate-400 text-sm">目前沒有購買品項資料</div>
            `);
        } else {
            items.forEach(function (item, index) {
                const isLast = index === items.length - 1;

                $itemsWrap.append(`
                    <div class="${isLast ? 'border-b-2 border-white/20 pb-5 mb-5' : 'pb-5'}">
                        <div class="flex items-center justify-between gap-4">
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

    $(document).on("click", ".openPurchaseDetailModal", function () {
        const $btn = $(this);
        const $card = $btn.closest('.order-card'); // 找到父層卡片

        // 抓取隱藏的明細資料
        const itemsArray = [];
        $card.find('.order-item-data').each(function () {
            itemsArray.push({
                name: $(this).data('name'),
                subtotal: $(this).data('subtotal')
            });
        });

        openPurchaseDetailModal({
            orderId: $btn.data("order-id"), // 傳遞 orderId 給彈窗導航用
            title: $btn.data("title"),
            date: $btn.data("date"),
            status: $btn.data("status"),
            price: $btn.data("price"),
            image: $btn.data("image"),
            items: itemsArray // 直接把乾淨的陣列送進去
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