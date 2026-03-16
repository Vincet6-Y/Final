$(function () {
    // =========================
    // 帳戶設定的下拉選單
    // =========================
    const $memberMenuBtn = $("#memberMenuBtn");
    const $memberMenu = $("#memberMenu");

    $memberMenu.hide();
    $memberMenuBtn.on("click", function (e) {
        e.stopPropagation();
        $memberMenu.stop(true, true).slideToggle(180);
    });
    $(document).on("click", function (e) {
        if (!$(e.target).closest("#memberMenu, #memberMenuBtn").length) {
            $memberMenu.stop(true, true).slideUp(180);
        }
    });

    // =========================
    // 🌟 側邊欄切換邏輯 (SPA 切換效果)
    // =========================
    const $navHome = $("#nav-home");
    const $navOrders = $("#nav-orders");
    const $navFavs = $("#nav-favs");

    const $sectionOrders = $("#section-orders");
    const $sectionFavs = $("#section-favs");

    function resetNav() {
        [$navHome, $navOrders, $navFavs].forEach($el => {
            $el.removeClass("text-primary bg-primary/10").addClass("text-slate-400 hover:text-slate-100");
        });
    }

    // --- 1. 處理【會員首頁】 ---
    $navHome.on("click", function () {
        resetNav();
        $(this).removeClass("text-slate-400 hover:text-slate-100").addClass("text-primary bg-primary/10");
        $sectionOrders.fadeIn(200);
        $sectionFavs.fadeIn(200);
        $(".extra-order-card, .extra-fav-card").addClass("hidden");
        $("#btn-view-all-orders, #btn-view-all-favs").show();
    });

    // --- 2. 處理【購買紀錄】 ---
    function showAllOrders() {
        resetNav();
        $navOrders.removeClass("text-slate-400 hover:text-slate-100").addClass("text-primary bg-primary/10");
        $sectionFavs.hide();
        $sectionOrders.fadeIn(200);
        $(".extra-order-card").removeClass("hidden").hide().fadeIn(300);
        $("#btn-view-all-orders").hide();
    }

    $navOrders.on("click", showAllOrders);
    $(document).on("click", "#btn-view-all-orders", showAllOrders);

    // --- 3. 處理【收藏行程】 ---
    function showAllFavs() {
        resetNav();
        $navFavs.removeClass("text-slate-400 hover:text-slate-100").addClass("text-primary bg-primary/10");
        $sectionOrders.hide();
        $sectionFavs.fadeIn(200);
        $(".extra-fav-card").removeClass("hidden").hide().fadeIn(300);
        $("#btn-view-all-favs").hide();
    }

    $navFavs.on("click", showAllFavs);
    $(document).on("click", "#btn-view-all-favs", showAllFavs);
    $("#btn-stats-favs").on("click", showAllFavs);

    // =========================
    // 🌟 取消收藏
    // =========================
    $(document).on("click", ".btn-remove-fav", function () {
        const $btn = $(this);
        const planId = $btn.data("plan-id");
        const $card = $btn.closest(".fav-card");

        $btn.css("opacity", "0.5").css("pointer-events", "none");

        $.ajax({
            url: `/api/favorites/toggle/${planId}`,
            type: "POST",
            success: function (response) {
                if (response.success && response.isFavorited === false) {

                    // 1. 卡片縮小並淡出的動畫
                    $card.css("transform", "scale(0.9)").fadeOut(300, function () {
                        $(this).remove();

                        // 2. 左側收藏數字減 1
                        let $countSpan = $("#btn-stats-favs span.text-3xl");
                        let currentCount = parseInt($countSpan.text());
                        if (!isNaN(currentCount) && currentCount > 0) {
                            $countSpan.text(currentCount - 1);
                        }

                        // 3. 自動補位魔法
                        let $nextCard = $(".fav-card.extra-fav-card").first();
                        if ($nextCard.length > 0) {
                            $nextCard.removeClass("extra-fav-card");
                            if ($nextCard.hasClass("hidden")) {
                                $nextCard.removeClass("hidden").hide().fadeIn(400);
                            }
                        }

                        // 4. 檢查剩下的總數量
                        let remainingCards = $(".fav-card").length;
                        if (remainingCards <= 2) {
                            $("#btn-view-all-favs").fadeOut(200);
                        }
                        if (remainingCards === 0) {
                            if ($("#empty-fav-state").length > 0) {
                                $("#empty-fav-state").fadeIn();
                            } else {
                                $(".grid.grid-cols-1").parent().append(`
                                            <div id="empty-fav-state" class="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-3">
                                                <span class="material-symbols-outlined text-4xl opacity-50">favorite_border</span>
                                                <p>目前還沒有收藏任何行程喔！去發掘喜歡的聖地吧！</p>
                                            </div>
                                        `);
                            }
                        }
                    });
                }
            },
            error: function (xhr) {
                if (xhr.status === 401) {
                    alert("登入已逾時，請重新登入！");
                    window.location.href = "/auth";
                } else {
                    alert("取消收藏失敗，請稍後再試！");
                    $btn.css("opacity", "1").css("pointer-events", "auto");
                }
            }
        });
    });

});