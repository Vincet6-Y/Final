// ==========================================
// 文章發布與管理
// ==========================================
$(document).ready(function () {

    let currentPage = 0;
    const pageSize = 10;

    // ==========================================
    // 1. 載入文章列表（支援分頁）
    // ==========================================
    function loadArticles(page = 0) {
        $.ajax({
            url: `/admin/articles?page=${page}&size=${pageSize}`,
            method: "GET",
            success: function (data) {
                renderTable(data.content);
                renderPagination(data);
                currentPage = page;
            },
            error: function () {
                showToast("error", "文章載入失敗，請重新整理");
            }
        });
    }

    // ==========================================
    // 2. 渲染表格列
    // ==========================================
    function renderTable(articles) {
        const tbody = $("#articleTableBody");
        tbody.empty();

        if (!articles || articles.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="5" class="text-center py-10 text-slate-500">目前沒有任何文章</td>
                </tr>
            `);
            return;
        }

        articles.forEach(article => {
            const statusBadge = getStatusBadge(article.status);
            const row = `
                <tr class="hover:bg-primary/5 transition-colors" data-id="${article.articleId}">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            ${article.articleImageUrl
                    ? `<img src="${article.articleImageUrl}" class="w-10 h-10 rounded object-cover flex-shrink-0" onerror="this.style.display='none'">`
                    : `<div class="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                     <span class="material-symbols-outlined text-primary text-base">article</span>
                                   </div>`
                }
                            <span class="font-medium text-sm line-clamp-1">${article.title || '未命名'}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-400">${article.articleClass || '未分類'}</td>
                    <td class="px-6 py-4 text-sm text-slate-400">管理員</td>
                    <td class="px-6 py-4">${statusBadge}</td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-2">
                            <button class="edit-btn p-1.5 rounded-lg hover:bg-primary/20 text-slate-400 hover:text-primary transition-colors" 
                                    data-id="${article.articleId}" title="編輯">
                                <span class="material-symbols-outlined text-sm">edit</span>
                            </button>
                            <button class="toggle-status-btn p-1.5 rounded-lg hover:bg-yellow-500/20 text-slate-400 hover:text-yellow-400 transition-colors" 
                                    data-id="${article.articleId}" data-status="${article.status}" title="切換狀態">
                                <span class="material-symbols-outlined text-sm">${article.status === 'published' ? 'visibility' : 'visibility_off'}</span>
                            </button>
                            <button class="delete-btn p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors" 
                                    data-id="${article.articleId}" title="刪除">
                                <span class="material-symbols-outlined text-sm">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
    }

    // ==========================================
    // 3. 狀態 Badge 樣式
    // ==========================================
    function getStatusBadge(status) {
        if (status === 'published') {
            return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-500/15 text-green-400 border border-green-500/20">
                        <span class="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>已發布
                    </span>`;
        } else {
            return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/20">
                        <span class="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span>草稿
                    </span>`;
        }
    }

    // ==========================================
    // 4. 渲染分頁按鈕
    // ==========================================
    function renderPagination(data) {
        const container = $("#paginationContainer");
        if (!container.length) return;
        container.empty();

        if (data.totalPages <= 1) return;

        for (let i = 0; i < data.totalPages; i++) {
            const isActive = i === data.number;
            const btn = `
                <button class="page-btn w-8 h-8 rounded-lg text-sm font-bold transition-colors
                    ${isActive ? 'bg-primary text-background-dark' : 'text-slate-400 hover:bg-primary/10'}"
                    data-page="${i}">${i + 1}</button>
            `;
            container.append(btn);
        }
    }

    // ==========================================
    // 5. 事件委派：編輯、切換狀態、刪除
    // ==========================================
    $("#articleTableBody").on("click", ".edit-btn", function () {
        const id = $(this).data("id");
        // 前往編輯頁（需在 backendarticle.html 加上帶 ID 的編輯模式，這裡先導向新增頁帶 query）
        window.location.href = `/backend/backendarticle?editId=${id}`;
    });

    $("#articleTableBody").on("click", ".toggle-status-btn", function () {
        const id = $(this).data("id");
        const currentStatus = $(this).data("status");
        const newStatus = currentStatus === 'published' ? 'draft' : 'published';

        // 先取得原本文章資料再 PUT（避免覆蓋其他欄位）
        $.ajax({
            url: `/admin/articles/${id}`,
            method: "GET",
            success: function (article) {
                article.status = newStatus;
                $.ajax({
                    url: `/admin/articles/${id}`,
                    method: "PUT",
                    contentType: "application/json",
                    data: JSON.stringify(article),
                    success: function () {
                        showToast("success", newStatus === 'published' ? "文章已發布" : "已設為草稿");
                        loadArticles(currentPage);
                    },
                    error: function () {
                        showToast("error", "狀態切換失敗");
                    }
                });
            },
            error: function () {
                showToast("error", "無法取得文章資料");
            }
        });
    });

    $("#articleTableBody").on("click", ".delete-btn", function () {
        const id = $(this).data("id");
        const row = $(this).closest("tr");
        const title = row.find("span.font-medium").text();

        if (!confirm(`確定要刪除「${title}」嗎？此操作無法還原。`)) return;

        $.ajax({
            url: `/admin/articles/${id}`,
            method: "DELETE",
            success: function () {
                showToast("success", "文章已刪除");
                loadArticles(currentPage);
            },
            error: function () {
                showToast("error", "刪除失敗");
            }
        });
    });

    // ==========================================
    // 6. 分頁點擊
    // ==========================================
    $(document).on("click", ".page-btn", function () {
        loadArticles($(this).data("page"));
    });

    // ==========================================
    // 7. 初始化載入
    // ==========================================
    loadArticles(0);
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
