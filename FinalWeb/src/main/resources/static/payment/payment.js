// ==========================================
// 全域資料
// ==========================================
const checkoutState = {
    baseTotal: window.checkoutData?.totalAmount || 0,
    myPlanId: window.checkoutData?.myPlanId || null
};

// ==========================================
// 工具函式
// ==========================================

// 安全解析日期 (如果 HTML 用 data-raw-date 才需要)
function parseDateSafe(dateStr) {
    if (!dateStr) return null;
    const normalized = dateStr.replace(/-/g, "/");
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return null;
    return d;
}

// 轉 yyyy-mm-dd
function formatDateInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// 數字格式化
function formatCurrency(num) {
    return "NT$ " + Number(num).toLocaleString();
}

// ==========================================
// 🌟 日期限制與初始化
// ==========================================
function initTravelDate() {
    const travelDateInput = document.getElementById("travelDate");
    if (!travelDateInput) return;

    // 設定最小日期為 3 天後
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 3);
    travelDateInput.min = formatDateInput(minDate);

    // 如果 HTML 用的是 th:value，下面這段其實不會生效，但留著防呆很安全
    const rawDateStr = travelDateInput.getAttribute("data-raw-date");
    if (rawDateStr) {
        const parsed = parseDateSafe(rawDateStr);
        if (parsed) {
            travelDateInput.value = formatDateInput(parsed);
        }
    }
}

// ==========================================
// ✏️ 行程名稱編輯
// ==========================================
function initPlanNameEditor() {
    window.editPlanName = function () {
        $("#planNameDisplayBlock").hide();
        $("#planNameEditBlock").removeClass("hidden").addClass("flex");
        $("#planNameInput").focus().select();
    };

    window.cancelEditPlanName = function () {
        $("#planNameEditBlock").removeClass("flex").addClass("hidden");
        $("#planNameDisplayBlock").show();
        $("#planNameInput").val($("#planNameDisplay").text().trim());
    };

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
// 🎫 加購邏輯
// ==========================================
function initAddonSystem() {
    const $ticketSelect = $("#ticketSelect");
    const $transportSelect = $("#transportSelect");

    $(".addon-select").on("change", recalculateTotal);

    // 刪除加購票
    $(".remove-ticket-btn").click(function () {
        $ticketSelect.val("0").trigger("change");
    });
    $(".remove-transport-btn").click(function () {
        $transportSelect.val("").trigger("change");
    });

    // 🌟 新增：刪除「來自行程規劃」的舊票券
    let removedDbTicketIds = [];
    $(".remove-db-ticket-btn").click(function () {
        const $row = $(this).closest('.db-ticket-row');
        const detailId = $(this).data('id');
        const price = Number($(this).data('price')) || 0;

        // 1. 把要刪除的 ID 記下來，塞進隱藏欄位傳給後端
        removedDbTicketIds.push(detailId);
        $('#removeDetailIds').val(removedDbTicketIds.join(','));

        // 2. 從總金額基數中扣除
        checkoutState.baseTotal -= price;

        // 3. 用動畫隱藏左邊和右邊的明細，然後徹底移除
        $row.fadeOut(200, function () { $(this).remove(); });
        $('#summary-db-' + detailId).fadeOut(200, function () { $(this).remove(); });

        // 4. 重新計算總金額
        recalculateTotal();
    });

    // 初始化時先算一次總額
    recalculateTotal();
}
// ==========================================
// 💰 金額計算
// ==========================================
function recalculateTotal() {
    const $ticketSelect = $("#ticketSelect");
    const $transportSelect = $("#transportSelect");

    // 取值
    const ticketPrice = Number($ticketSelect.val()) || 0;
    const ticketName = $ticketSelect.find("option:selected").data("name") || "";

    const transId = $transportSelect.val() || "";
    const transportPrice = Number($transportSelect.find("option:selected").data("price")) || 0;
    const transportName = $transportSelect.find("option:selected").data("name") || "";

    // ------------------------
    // UI 更新：景點票
    // ------------------------
    if (ticketPrice > 0) {
        // 🌟 加上 flex 確保 Tailwind 排版正確
        $("#addon-ticket-row,#summary-addon-ticket").removeClass("hidden").addClass("flex");
        $("#addon-ticket-name,#summary-ticket-name").text(ticketName);
        $("#addon-ticket-price,#summary-ticket-price").text(formatCurrency(ticketPrice));
    } else {
        $("#addon-ticket-row,#summary-addon-ticket").addClass("hidden").removeClass("flex");
    }

    // ------------------------
    // UI 更新：交通票
    // ------------------------
    if (transportPrice > 0) {
        // 🌟 加上 flex 確保 Tailwind 排版正確
        $("#addon-transport-row,#summary-addon-transport").removeClass("hidden").addClass("flex");
        $("#addon-transport-name,#summary-transport-name").text(transportName);
        $("#addon-transport-price,#summary-transport-price").text(formatCurrency(transportPrice));
    } else {
        $("#addon-transport-row,#summary-addon-transport").addClass("hidden").removeClass("flex");
    }

    // ------------------------
    // 顯示/隱藏 addon summary 區塊
    // ------------------------
    if (ticketPrice > 0 || transportPrice > 0) {
        $("#addon-summary").removeClass("hidden");
    } else {
        $("#addon-summary").addClass("hidden");
    }

    // ------------------------
    // 計算與更新總額
    // ------------------------
    const grandTotal = checkoutState.baseTotal + ticketPrice + transportPrice;
    $("#display-total").text(formatCurrency(grandTotal));

    // ------------------------
    // 同步 hidden 欄位 (供表單送出)
    // ------------------------
    $("#addonTicketName").val(ticketName);
    $("#addonTicketPrice").val(ticketPrice);
    $("#transportId").val(transId);
}

// ==========================================
// 🧾 Checkout 驗證
// ==========================================
function initCheckoutValidation() {
    $("#checkoutForm").on("submit", function (e) {
        // 先同步目前畫面上的值到 hidden 欄位
        const planName = $("#planNameInput").val().trim();
        const startDate = $("#travelDate").val();

        if (!planName) {
            alert("請輸入行程名稱");
            e.preventDefault();
            return false;
        }

        if (!startDate) {
            alert("請選擇出發日期");
            e.preventDefault();
            return false;
        }

        if (!$("#agreeCheckbox").is(":checked")) {
            alert("請先同意服務條款");
            e.preventDefault();
            return false;
        }

        // 把最新的值塞進隱藏欄位，準備送出
        $("#checkoutPlanName").val(planName);
        $("#checkoutStartDate").val(startDate);
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