// ==========================================
// 🌟 日曆限制 (防止使用者修改成過去的日期，只能選 3 天後)
// ==========================================
const travelDateInput = document.getElementById('travelDate');
if (travelDateInput) {
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 3);

    const year = minDate.getFullYear();
    const month = String(minDate.getMonth() + 1).padStart(2, '0');
    const day = String(minDate.getDate()).padStart(2, '0');

    travelDateInput.min = `${year}-${month}-${day}`;
}

// ==========================================
// 行程名稱變更功能
// ==========================================
function editPlanName() {
    $('#planNameDisplayBlock').hide();
    $('#planNameEditBlock').removeClass('hidden').addClass('flex');
    $('#planNameInput').focus().select();
}

function cancelEditPlanName() {
    $('#planNameEditBlock').removeClass('flex').addClass('hidden');
    $('#planNameDisplayBlock').show();
    // 恢復原值
    $('#planNameInput').val($('#planNameDisplay').text().trim());
}

function savePlanName() {
    const newName = $('#planNameInput').val().trim();
    if (!newName) {
        alert("名稱不可為空");
        return;
    }

    // 🌟 改變點 1：從全域變數讀取 Thymeleaf 傳來的 myPlanId
    const myPlanId = window.checkoutData.myPlanId;
    if (!myPlanId) {
        alert("找不到對應的行程ID，無法編輯名稱。");
        cancelEditPlanName();
        return;
    }

    $.ajax({
        url: `/api/plan/updateName/${myPlanId}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ name: newName }),
        success: function (res) {
            if (res.success) {
                $('#planNameDisplay').text(res.newName);
                cancelEditPlanName();
            } else {
                alert(res.message || "更新失敗");
            }
        },
        error: function (xhr) {
            alert('更新失敗，請檢查網路狀態');
        }
    });
}

// ==========================================
// 🎫 jQuery 自動加總邏輯與驗證
// ==========================================
$(document).ready(function () {
    // 🌟 改變點 2：從全域變數讀取 Thymeleaf 傳來的總金額
    const dbTotal = window.checkoutData.totalAmount || 0;

    // 每當加購下拉選單改變，就重新計算
    $('.addon-select').on('change', function () {
        recalculateTotal();
    });

    function recalculateTotal() {
        // — 景點門票加購 —
        const $ticketSelect = $('#ticketSelect');
        const ticketPrice = parseInt($ticketSelect.val()) || 0;
        const ticketName = $ticketSelect.find('option:selected').data('name') || '';

        // — 交通票券加購 —
        const $transportSelect = $('#transportSelect');
        const transportPrice = parseInt($transportSelect.val()) || 0;
        const transportName = $transportSelect.find('option:selected').data('name') || '';

        // — 更新加購摘要區塊 —
        if (ticketPrice > 0) {
            $('#addon-ticket-row').removeClass('hidden');
            $('#addon-ticket-name').text(ticketName);
            $('#addon-ticket-price').text('NT$ ' + ticketPrice.toLocaleString());
            $('#summary-addon-ticket').removeClass('hidden');
            $('#summary-ticket-name').text(ticketName);
            $('#summary-ticket-price').text('NT$ ' + ticketPrice.toLocaleString());
        } else {
            $('#addon-ticket-row').addClass('hidden');
            $('#summary-addon-ticket').addClass('hidden');
        }

        if (transportPrice > 0) {
            $('#addon-transport-row').removeClass('hidden');
            $('#addon-transport-name').text(transportName);
            $('#addon-transport-price').text('NT$ ' + transportPrice.toLocaleString());
            $('#summary-addon-transport').removeClass('hidden');
            $('#summary-transport-name').text(transportName);
            $('#summary-transport-price').text('NT$ ' + transportPrice.toLocaleString());
        } else {
            $('#addon-transport-row').addClass('hidden');
            $('#summary-addon-transport').addClass('hidden');
        }

        // 顯示/隱藏加購摘要整個區塊
        if (ticketPrice > 0 || transportPrice > 0) {
            $('#addon-summary').removeClass('hidden');
        } else {
            $('#addon-summary').addClass('hidden');
        }

        // — 計算最終總額 —
        const grandTotal = dbTotal + ticketPrice + transportPrice;
        $('#display-total').text('NT$ ' + grandTotal.toLocaleString());

        // — 同步隱藏欄位值，提交時後端會用到 —
        $('#addonTicketName').val(ticketName);
        $('#addonTicketPrice').val(ticketPrice);
        $('#addonTransportName').val(transportName);
        $('#addonTransportPrice').val(transportPrice);
    }

    // ✅ 結帳前驗證
    $('#checkoutForm').on('submit', function (e) {
        // 將目前的名稱塞入隱藏欄位，確保結帳時標題會隨之存檔
        $('#checkoutPlanName').val($('#planNameInput').val().trim());

        if (!$('#agreeCheckbox').is(':checked')) {
            e.preventDefault();
            alert('請先勾選同意服務條款與隱私權聲明！');
            return false;
        }
    });
});