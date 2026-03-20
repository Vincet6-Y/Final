//文章發布與管理
$(document).ready(function () {
    fetchLatestArticles();
});
function fetchLatestArticles() {
    // 呼叫你的 API，取得最新的 5 篇文章 (size=5)
    $.ajax({
        url: "/admin/articles?page=0&size=5",
        method: "GET",
        success: function (response) {
            const tbody = $("#articleTableBody");
            tbody.empty();
            const articles = response.content;
            if (articles.length === 0) {
                tbody.append('<tr><td colspan="5" class="text-center py-4 text-slate-500">目前尚無文章</td></tr>');
                return;
            }

            // 跑迴圈生成每一列
            articles.forEach(function (article) {
                // 判斷狀態與顏色
                let statusHtml = '';
                if (article.status === 'published') {
                    statusHtml = `<span class="flex items-center gap-1.5 text-xs text-green-500">
                                        <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span> 已發布
                                      </span>`;
                } else {
                    statusHtml = `<span class="flex items-center gap-1.5 text-xs text-amber-500">
                                        <span class="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> 草稿
                                      </span>`;
                }

                // 處理時間 (若無更新時間則顯示建立時間)
                let timeDisplay = article.updatedTime ? article.updatedTime : (article.createdTime ? article.createdTime : '剛剛');

                // 為了美觀，我們截斷時間的小數點部分 (例如 2026-03-10T14:30:00)
                if (timeDisplay && timeDisplay.includes('T')) {
                    timeDisplay = timeDisplay.split('T')[0];
                }

                // 組裝單行的 HTML
                const tr = `
                        <tr class="hover:bg-primary/5 transition-colors">
                            <td class="px-6 py-4">
                                <p class="text-sm font-medium">${article.title}</p>
                                <p class="text-[10px] text-slate-500 mt-0.5">最後編輯: ${timeDisplay}</p>
                            </td>
                            <td class="px-6 py-4">
                                <span class="text-xs text-primary bg-primary/10 px-2 py-1 rounded">${article.articleClass || '未分類'}</span>
                            </td>
                            <td class="px-6 py-4 text-sm">管理員 A</td>
                            <td class="px-6 py-4">
                                ${statusHtml}
                            </td>
                            <td class="px-6 py-4 text-right">
                                <button class="material-symbols-outlined text-slate-400 hover:text-primary transition-colors">more_horiz</button>
                            </td>
                        </tr>
                    `;
                tbody.append(tr);
            });
        },
        error: function () {
            console.error("無法取得文章列表");
        }
    });
}

// ==========================================
// 1. 行程套裝上下架切換邏輯 (優化同步版)
// ==========================================
$(document).on('click', '.toggle-plan-btn', function () {
    const btn = $(this);
    const planId = btn.data('plan-id');
    const currentStatus = btn.attr('data-status') === 'true';
    const newStatus = !currentStatus;

    $.ajax({
        url: "/backend/contentmanagement/plan/toggleStatus",
        method: "POST",
        data: { planId: planId, status: newStatus },
        success: function () {
            // 【優化】選取畫面上所有相同 ID 的按鈕 (包含主畫面與 Modal 內的)，讓它們同步更新！
            const allMatchingBtns = $('.toggle-plan-btn[data-plan-id="' + planId + '"]');
            const circles = allMatchingBtns.find('div');

            allMatchingBtns.attr('data-status', newStatus);

            if (newStatus) {
                allMatchingBtns.removeClass('bg-slate-700').addClass('bg-primary/20');
                circles.removeClass('left-0.5 bg-slate-400').addClass('right-0.5 bg-primary');
            } else {
                allMatchingBtns.removeClass('bg-primary/20').addClass('bg-slate-700');
                circles.removeClass('right-0.5 bg-primary').addClass('left-0.5 bg-slate-400');
            }
        },
        error: function () {
            showToast('error', '狀態更新失敗，請稍後再試。');
        }
    });
});

// ==========================================
// 2. 彈窗 (Modal) 開關邏輯
// ==========================================
$('#openPlanModalBtn').on('click', function () {
    $('#planModal').removeClass('hidden');
    $('body').css('overflow', 'hidden'); // 防止背景滾動
});

$('#closePlanModal').on('click', function () {
    $('#planModal').addClass('hidden');
    $('body').css('overflow', ''); // 恢復背景滾動
});

// 點擊 Modal 背景處也可關閉
$('#planModal').on('click', function (e) {
    if (e.target === this) {
        $(this).addClass('hidden');
        $('body').css('overflow', '');
    }
});

// ==========================================
// 3. 頁籤 (Tabs) 天數篩選邏輯
// ==========================================
$('.plan-tab').on('click', function () {
    // 改變頁籤的 UI 狀態 (底線與顏色)
    $('.plan-tab')
        .removeClass('active-tab text-primary border-primary')
        .addClass('text-slate-400 border-transparent');
    $(this)
        .removeClass('text-slate-400 border-transparent')
        .addClass('active-tab text-primary border-primary');

    // 取得點擊的天數目標 (all, 5, 10)
    const targetDays = $(this).data('target');

    // 進行列表篩選
    if (targetDays === 'all') {
        $('.modal-plan-row').show(); // 顯示全部
    } else {
        $('.modal-plan-row').hide(); // 先隱藏全部
        // 只顯示符合 daysCount 的項目
        $('.modal-plan-row[data-days="' + targetDays + '"]').show();
    }
});

// ==========================================
// 彈窗 (Modal) 內的批次管理與全選邏輯
// ==========================================

// 1. 進入/退出 彈窗的批次模式
$('#modalEnterBatchBtn').on('click', function () {
    $(this).addClass('hidden');
    $('#modalBatchActionBar').removeClass('hidden');
    $('.modal-batch-checkbox-container').removeClass('hidden');
    $('.modal-plan-row .toggle-plan-btn').addClass('pointer-events-none opacity-50'); // 停用單一開關
});

$('#modalExitBatchBtn').on('click', function () {
    $('#modalEnterBatchBtn').removeClass('hidden');
    $('#modalBatchActionBar').addClass('hidden');
    $('.modal-batch-checkbox-container').addClass('hidden');

    // 清空所有勾選狀態
    $('.modal-plan-checkbox').prop('checked', false);
    $('#modalSelectAll').prop('checked', false);
    $('.modal-plan-row .toggle-plan-btn').removeClass('pointer-events-none opacity-50');
});

// 2. 彈窗內的「全部選取」邏輯 (只會選取當前顯示的頁籤內容)
$('#modalSelectAll').on('change', function () {
    const isChecked = $(this).prop('checked');
    // 使用 :visible 過濾，確保只選取當前篩選天數下看得見的行程
    $('.modal-plan-row:visible .modal-plan-checkbox').prop('checked', isChecked);
});

// 當手動取消某個項目的勾選時，自動取消「全選」的勾選狀態
$(document).on('change', '.modal-plan-checkbox', function () {
    if (!$(this).prop('checked')) {
        $('#modalSelectAll').prop('checked', false);
    }
});

// ==========================================
// 批次管理模式切換與執行邏輯
// ==========================================

// 1. 進入批次模式
$('#enterBatchModeBtn').on('click', function () {
    $('#normal-action-btns').addClass('hidden');
    $('#batch-action-btns').removeClass('hidden');
    $('.batch-checkbox-container').removeClass('hidden');
    $('.toggle-plan-btn').addClass('pointer-events-none opacity-50'); // 批次模式時，暫時停用單一開關
});

// 2. 退出批次模式
$('#exitBatchModeBtn').on('click', function () {
    $('#batch-action-btns').addClass('hidden');
    $('#normal-action-btns').removeClass('hidden');
    $('.batch-checkbox-container').addClass('hidden');
    $('.plan-checkbox').prop('checked', false); // 清空所有勾選
    $('.toggle-plan-btn').removeClass('pointer-events-none opacity-50'); // 恢復單一開關
});

// 3. 執行批次動作的共用函數
function executeBatchAction(status, checkboxClass) {
    const selectedIds = [];
    $(checkboxClass + ':checked').each(function () {
        selectedIds.push($(this).val());
    });

    if (selectedIds.length === 0) {
        showToast('warning', '請至少勾選一個行程！');
        return;
    }

    $.ajax({
        url: "/backend/contentmanagement/plan/batchToggleStatus",
        method: "POST",
        data: {
            planIds: selectedIds,
            status: status
        },
        success: function () {
            showToast('success', '批次更新成功！');
            setTimeout(() => {
                location.reload();
            }, 1500);
        },
        error: function () {
            showToast('error', '批次更新失敗，請稍後再試。');
        }
    });
}

// ==========================================
// 自訂確認對話框邏輯
// ==========================================

// 儲存當前準備執行的動作
let pendingBatchAction = null;
let pendingCheckboxClass = null;

function showCustomConfirm(title, message, actionCallback, checkboxClass) {
    // 設定文字內容
    $('#confirmTitle').text(title);
    $('#confirmMessage').text(message);

    // 儲存待執行的動作與對應的 checkbox class
    pendingBatchAction = actionCallback;
    pendingCheckboxClass = checkboxClass;

    // 顯示彈窗
    $('#customConfirmModal').removeClass('hidden');
}

function closeCustomConfirm() {
    $('#customConfirmModal').addClass('hidden');
    pendingBatchAction = null;
    pendingCheckboxClass = null;
}

// 綁定自訂對話框的取消按鈕
$('#cancelConfirmBtn').on('click', function () {
    closeCustomConfirm();
});

// 綁定自訂對話框的確定按鈕
$('#executeConfirmBtn').on('click', function () {
    if (pendingBatchAction !== null) {
        // 執行我們儲存的動作，並傳入正確的 checkbox 選擇器
        executeBatchAction(pendingBatchAction, pendingCheckboxClass);
        closeCustomConfirm();
    }
});

// ==========================================
// 綁定批次上架與下架按鈕 (使用自訂對話框)
// ==========================================

// 主畫面的按鈕
$('#batchPublishBtn').on('click', function () {
    showCustomConfirm('全部上架', '確定要將勾選的行程「全部上架」嗎？', true, '.plan-checkbox');
});

$('#batchUnpublishBtn').on('click', function () {
    showCustomConfirm('全部下架', '確定要將勾選的行程「全部下架」嗎？', false, '.plan-checkbox');
});

// 如果你也有加上彈窗內的批次按鈕，請一併更新
$('#modalBatchPublishBtn').on('click', function () {
    showCustomConfirm('全部上架', '確定要將彈窗內勾選的行程「全部上架」嗎？', true, '.modal-plan-checkbox');
});

$('#modalBatchUnpublishBtn').on('click', function () {
    showCustomConfirm('全部下架', '確定要將彈窗內勾選的行程「全部下架」嗎？', false, '.modal-plan-checkbox');
});
