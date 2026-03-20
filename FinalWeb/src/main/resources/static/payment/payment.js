// ==========================================
// 全域資料與購物車狀態
// ==========================================
const checkoutState = {
    baseTotal: window.checkoutData?.totalAmount || 0, // 初始訂單總額
    myPlanId: window.checkoutData?.myPlanId || null,  // 行程 ID
    addedTickets: [],     // 存放加購的景點門票
    addedTransports: []   // 存放加購的交通票
};

// ==========================================
// 工具函式
// ==========================================

// 金額格式化 (加上 NT$ 與千分位逗號)
function formatCurrency(num) {
    return "NT$ " + Number(num).toLocaleString();
}

// 轉成 yyyy-mm-dd 格式 (給 input[type="date"] 用)
function formatDateInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// ==========================================
// 🌟 日期限制與連動初始化
// ==========================================
function initTravelDate() {
    const travelDateInput = document.getElementById("travelDate");
    const displayStartDate = document.getElementById("displayStartDate"); // 抓取上方顯示用的文字標籤

    if (travelDateInput) {
        // 設定最小日期為今天算起的 3 天後
        const today = new Date();
        const minDate = new Date(today);
        minDate.setDate(today.getDate() + 3);
        travelDateInput.min = formatDateInput(minDate);

        // 🌟 日期連動事件：當下方輸入框改變時，上方文字跟著變更
        travelDateInput.addEventListener('change', function () {
            if (this.value && displayStartDate) {
                // 將 2026-03-25 轉成 2026/03/25 的漂亮格式
                displayStartDate.textContent = this.value.replace(/-/g, '/');
            }
        });
    }
}

// ==========================================
// ✏️ 行程名稱編輯
// ==========================================
function initPlanNameEditor() {
    // 點擊編輯按鈕：隱藏純文字，顯示輸入框
    window.editPlanName = function () {
        $("#planNameDisplayBlock").hide();
        $("#planNameEditBlock").removeClass("hidden").addClass("flex");
        $("#planNameInput").focus().select();
    };

    // 點擊取消：隱藏輸入框，顯示純文字
    window.cancelEditPlanName = function () {
        $("#planNameEditBlock").removeClass("flex").addClass("hidden");
        $("#planNameDisplayBlock").show();
        $("#planNameInput").val($("#planNameDisplay").text().trim());
    };

    // 點擊儲存：透過 AJAX 更新資料庫的行程名稱
    window.savePlanName = function () {
        const newName = $("#planNameInput").val().trim();
        if (!newName) {
            alert("名稱不可為空");
            return;
        }

        const myPlanId = checkoutState.myPlanId;
        if (!myPlanId) {
            alert("找不到行程 ID");
            cancelEditPlanName();
            return;
        }

        $.ajax({
            url: `/api/plan/updateName/${myPlanId}`,
            method: "PUT",
            contentType: "application/json",
            data: JSON.stringify({ name: newName }),
            success: function (res) {
                if (res.success) {
                    // 更新成功後，修改畫面上的文字並關閉編輯框
                    $("#planNameDisplay").text(res.newName);
                    cancelEditPlanName();
                } else {
                    alert(res.message || "更新失敗");
                }
            },
            error: function () {
                alert("更新失敗，請稍後再試");
            }
        });
    };
}

// ==========================================
// 🎫 多選購物車核心邏輯
// ==========================================
function initAddonSystem() {

    // 1. 監聽景點票下拉選單
    $("#ticketSelect").on("change", function () {
        const price = Number($(this).val());
        if (price > 0) {
            const name = $(this).find("option:selected").data("name");
            // 將選中的票券加入購物車陣列
            checkoutState.addedTickets.push({ name: name, price: price, uid: Date.now() });
            // 把剛剛選中的選項設為 disabled 並隱藏
            $(this).find(`option`).filter(function () {
                return $(this).data("name") === name;
            }).prop("disabled", true).hide();

            $(this).val("0"); // 選完後將下拉選單歸零
            renderAddons();   // 重新渲染畫面
        }
    });

    // 2. 監聽交通票下拉選單
    $("#transportSelect").on("change", function () {
        const id = $(this).val(); // 取得交通票專屬的 ticketId
        if (id !== "") {
            const price = Number($(this).find("option:selected").data("price"));
            const name = $(this).find("option:selected").data("name");
            // 將選中的票券加入購物車陣列
            checkoutState.addedTransports.push({ id: id, name: name, price: price, uid: Date.now() });
            // 把剛剛選中的選項設為 disabled 並隱藏
            $(this).find(`option[value="${id}"]`).prop("disabled", true).hide();

            $(this).val(""); // 選完後將下拉選單歸零
            renderAddons();  // 重新渲染畫面
        }
    });

    // 3. 點擊 X 刪除剛剛動態加購的項目
    $(document).on("click", ".remove-added-ticket-btn", function () {
        const uid = $(this).data("uid");
        const name = $(this).data("name"); // 抓出綁在按鈕上的票券名稱

        // 把它加回下拉選單
        if (name) {
            $("#ticketSelect").find(`option`).filter(function () {
                return $(this).data("name") === name;
            }).prop("disabled", false).show();
        }
        // 透過 filter 濾掉被點擊的那一張票
        checkoutState.addedTickets = checkoutState.addedTickets.filter(t => t.uid !== uid);
        renderAddons();
    });

    $(document).on("click", ".remove-added-transport-btn", function () {
        const uid = $(this).data("uid");
        const id = $(this).data("id"); // 抓出綁在按鈕上的票券 ID

        // 把它加回下拉選單
        if (id) {
            $("#transportSelect").find(`option[value="${id}"]`).prop("disabled", false).show();
        }
        checkoutState.addedTransports = checkoutState.addedTransports.filter(t => t.uid !== uid);
        renderAddons();
    });

    // 4. 刪除資料庫原本就包含的舊票券 (維持不變)
    let removedDbTicketIds = [];
    $(".remove-db-ticket-btn").click(function () {
        const $row = $(this).closest('.db-ticket-row');
        const detailId = $(this).data('id');
        const price = Number($(this).data('price')) || 0;
        const name = $(this).data('name'); // 我們在 HTML 中新增了 data-name="" 屬性

        // 把要刪除的 ID 記錄下來，並塞入隱藏欄位供後端讀取
        removedDbTicketIds.push(detailId);
        $('#removeDetailIds').val(removedDbTicketIds.join(','));
        // 從總金額基數中扣除
        checkoutState.baseTotal -= price;
        // 隱藏並徹底移除畫面元素
        $row.fadeOut(200, function () { $(this).remove(); });
        $('#summary-db-' + detailId).fadeOut(200, function () { $(this).remove(); });

        // 🌟 將取消的舊票券放回下拉選單！
        if (name) {
            // 先找景點門票
            let $opt = $("#ticketSelect").find(`option`).filter(function () {
                return $(this).data("name") === name;
            });
            if ($opt.length > 0) {
                $opt.prop("disabled", false).show(); // 如果是舊版的寫法，也可以直接 .css("display", "") 
            } else {
                // 如果找不到，改找交通票
                let $transOpt = $("#transportSelect").find(`option`).filter(function () {
                    return $(this).data("name") === name;
                });
                if ($transOpt.length > 0) {
                    $transOpt.prop("disabled", false).show();
                }
            }
        }

        renderAddons();
    });

    // 初始化時先渲染一次
    renderAddons();
}

// ==========================================
// 🎨 動態渲染購物車畫面與計算總額
// ==========================================
function renderAddons() {
    let ticketHtml = '';
    let summaryTicketHtml = '';
    let ticketTotal = 0;

    checkoutState.addedTickets.forEach(t => {
        ticketTotal += t.price;
        // 左側明細 (🌟 這裡在 button 加上了 data-name="${t.name}" 讓刪除時可以抓到)
        ticketHtml += `
            <div class="flex justify-between items-center text-sm text-orange-600 dark:text-orange-400 mt-2">
                <span class="flex items-center gap-2"><span class="material-symbols-outlined text-sm">confirmation_number</span>${t.name}</span>
                <div class="flex items-center gap-3">
                    <span class="font-bold">${formatCurrency(t.price)}</span>
                    <button type="button" class="remove-added-ticket-btn text-gray-400 hover:text-red-500 transition-colors" data-uid="${t.uid}" data-name="${t.name}"><span class="material-symbols-outlined text-lg">cancel</span></button>
                </div>
            </div>`;
        // 右側表單明細
        summaryTicketHtml += `
            <div class="flex justify-between items-center text-orange-500 text-sm mb-2">
                <span class="flex items-center gap-2"><span class="material-symbols-outlined text-xs">add_circle</span>${t.name}</span>
                <span class="font-medium">${formatCurrency(t.price)}</span>
            </div>`;
    });

    $("#ticket-list-container").html(ticketHtml);
    $("#summary-ticket-list").html(summaryTicketHtml);

    let transportHtml = '';
    let summaryTransportHtml = '';
    let transportTotal = 0;
    // 迴圈讀取所有加購的交通票，組合出左側與右側的 HTML

    checkoutState.addedTransports.forEach(t => {
        transportTotal += t.price;
        // 左側明細 (🌟 這裡在 button 加上了 data-id="${t.id}" 讓刪除時可以抓到)
        transportHtml += `
            <div class="flex justify-between items-center text-sm text-blue-600 dark:text-blue-400 mt-2">
                <span class="flex items-center gap-2"><span class="material-symbols-outlined text-sm">train</span>${t.name}</span>
                <div class="flex items-center gap-3">
                    <span class="font-bold">${formatCurrency(t.price)}</span>
                    <button type="button" class="remove-added-transport-btn text-gray-400 hover:text-red-500 transition-colors" data-uid="${t.uid}" data-id="${t.id}"><span class="material-symbols-outlined text-lg">cancel</span></button>
                </div>
            </div>`;
        summaryTransportHtml += `
            <div class="flex justify-between items-center text-blue-500 text-sm mb-2">
                <span class="flex items-center gap-2"><span class="material-symbols-outlined text-xs">add_circle</span>${t.name}</span>
                <span class="font-medium">${formatCurrency(t.price)}</span>
            </div>`;
    });

    $("#transport-list-container").html(transportHtml);
    $("#summary-transport-list").html(summaryTransportHtml);

    // 結算總金額
    const grandTotal = checkoutState.baseTotal + ticketTotal + transportTotal;
    $("#display-total").text(formatCurrency(grandTotal));

    if (checkoutState.addedTickets.length > 0 || checkoutState.addedTransports.length > 0) {
        $("#addon-summary").removeClass("hidden");
    } else {
        $("#addon-summary").addClass("hidden");
    }
}

// 控制左側加購明細外框的顯示與隱藏 (如果購物車是空的就隱藏)
if (checkoutState.addedTickets.length > 0 || checkoutState.addedTransports.length > 0) {
    $("#addon-summary").removeClass("hidden");
} else {
    $("#addon-summary").addClass("hidden");
}


// ==========================================
// 🧾 Checkout 表單送出前動態組裝
// ==========================================
function initCheckoutValidation() {
    $("#checkoutForm").on("submit", function (e) {
        const planName = $("#planNameInput").val().trim();
        const startDate = $("#travelDate").val();

        // 基本驗證
        if (!planName) { alert("請輸入行程名稱"); e.preventDefault(); return false; }
        if (!startDate) { alert("請選擇出發日期"); e.preventDefault(); return false; }
        if (!$("#agreeCheckbox").is(":checked")) { alert("請先同意服務條款"); e.preventDefault(); return false; }

        // 同步修改後的資料
        $("#checkoutPlanName").val(planName);
        $("#checkoutStartDate").val(startDate);

        // 🌟 核心：在送出前，自動將購物車陣列轉換為隱藏的 <input>，讓後端 Controller 接收
        $(".dynamic-addon-input").remove(); // 先清空舊的，避免重複塞入

        checkoutState.addedTickets.forEach(t => {
            $(this).append(`<input type="hidden" name="addonTicketName" value="${t.name}" class="dynamic-addon-input">`);
            $(this).append(`<input type="hidden" name="addonTicketPrice" value="${t.price}" class="dynamic-addon-input">`);
        });

        checkoutState.addedTransports.forEach(t => {
            // 變數名稱 transportIds 與後端 Controller 接的參數一致！
            $(this).append(`<input type="hidden" name="transportIds" value="${t.id}" class="dynamic-addon-input">`);
        });
    });
}

// ==========================================
// 🚀 初始化
// ==========================================
$(document).ready(function () {
    initTravelDate();
    initPlanNameEditor();
    initAddonSystem();
    initCheckoutValidation();
});