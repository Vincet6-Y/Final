$(document).ready(function () {

    // ==========================================
    // 🌟 文章發布與管理
    // ==========================================

    $("#articleTableBody").on("click", ".toggle-status-btn", function () {
        const id = $(this).data("id");
        const currentStatus = $(this).data("status");
        const newStatus = currentStatus === 'published' ? 'draft' : 'published';

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
                        // 狀態修改成功後，直接重新整理畫面以套用後端最新的 Thymeleaf 渲染
                        window.location.reload();
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
                window.location.reload();
            },
            error: function () {
                showToast("error", "刪除失敗");
            }
        });
    });


    // ==========================================
    // 🌟 行程套裝上下架與模態框邏輯
    // ==========================================

    // 1. 行程套裝上下架切換邏輯
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

    // 2. 彈窗 (Modal) 開關邏輯
    $('#openPlanModalBtn').on('click', function () {
        $('#planModal').removeClass('hidden');
        $('body').css('overflow', 'hidden');
    });

    $('#closePlanModal').on('click', function () {
        $('#planModal').addClass('hidden');
        $('body').css('overflow', '');
    });

    $('#planModal').on('click', function (e) {
        if (e.target === this) {
            $(this).addClass('hidden');
            $('body').css('overflow', '');
        }
    });

    // 3. 頁籤 (Tabs) 天數篩選邏輯
    $('.plan-tab').on('click', function () {
        $('.plan-tab')
            .removeClass('active-tab text-primary border-primary')
            .addClass('text-slate-400 border-transparent');
        $(this)
            .removeClass('text-slate-400 border-transparent')
            .addClass('active-tab text-primary border-primary');

        const targetDays = $(this).data('target');

        if (targetDays === 'all') {
            $('.modal-plan-row').show();
        } else {
            $('.modal-plan-row').hide();
            $('.modal-plan-row[data-days="' + targetDays + '"]').show();
        }
    });

    // 4. 彈窗內的批次管理與全選邏輯
    $('#modalEnterBatchBtn').on('click', function () {
        $(this).addClass('hidden');
        $('#modalBatchActionBar').removeClass('hidden');
        $('.modal-batch-checkbox-container').removeClass('hidden');
        $('.modal-plan-row .toggle-plan-btn').addClass('pointer-events-none opacity-50');
    });

    $('#modalExitBatchBtn').on('click', function () {
        $('#modalEnterBatchBtn').removeClass('hidden');
        $('#modalBatchActionBar').addClass('hidden');
        $('.modal-batch-checkbox-container').addClass('hidden');
        $('.modal-plan-checkbox').prop('checked', false);
        $('#modalSelectAll').prop('checked', false);
        $('.modal-plan-row .toggle-plan-btn').removeClass('pointer-events-none opacity-50');
    });

    $('#modalSelectAll').on('change', function () {
        const isChecked = $(this).prop('checked');
        $('.modal-plan-row:visible .modal-plan-checkbox').prop('checked', isChecked);
    });

    $(document).on('change', '.modal-plan-checkbox', function () {
        if (!$(this).prop('checked')) {
            $('#modalSelectAll').prop('checked', false);
        }
    });

    // 5. 主畫面批次管理模式切換與執行邏輯
    $('#enterBatchModeBtn').on('click', function () {
        $('#normal-action-btns').addClass('hidden');
        $('#batch-action-btns').removeClass('hidden');
        $('.batch-checkbox-container').removeClass('hidden');
        $('.toggle-plan-btn').addClass('pointer-events-none opacity-50');
    });

    $('#exitBatchModeBtn').on('click', function () {
        $('#batch-action-btns').addClass('hidden');
        $('#normal-action-btns').removeClass('hidden');
        $('.batch-checkbox-container').addClass('hidden');
        $('.plan-checkbox').prop('checked', false);
        $('.toggle-plan-btn').removeClass('pointer-events-none opacity-50');
    });

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

    // 6. 自訂確認對話框邏輯
    let pendingBatchAction = null;
    let pendingCheckboxClass = null;

    function showCustomConfirm(title, message, actionCallback, checkboxClass) {
        $('#confirmTitle').text(title);
        $('#confirmMessage').text(message);
        pendingBatchAction = actionCallback;
        pendingCheckboxClass = checkboxClass;
        $('#customConfirmModal').removeClass('hidden');
    }

    function closeCustomConfirm() {
        $('#customConfirmModal').addClass('hidden');
        pendingBatchAction = null;
        pendingCheckboxClass = null;
    }

    $('#cancelConfirmBtn').on('click', function () {
        closeCustomConfirm();
    });

    $('#executeConfirmBtn').on('click', function () {
        if (pendingBatchAction !== null) {
            executeBatchAction(pendingBatchAction, pendingCheckboxClass);
            closeCustomConfirm();
        }
    });

    $('#batchPublishBtn').on('click', function () {
        showCustomConfirm('全部上架', '確定要將勾選的行程「全部上架」嗎？', true, '.plan-checkbox');
    });

    $('#batchUnpublishBtn').on('click', function () {
        showCustomConfirm('全部下架', '確定要將勾選的行程「全部下架」嗎？', false, '.plan-checkbox');
    });

    $('#modalBatchPublishBtn').on('click', function () {
        showCustomConfirm('全部上架', '確定要將彈窗內勾選的行程「全部上架」嗎？', true, '.modal-plan-checkbox');
    });

    $('#modalBatchUnpublishBtn').on('click', function () {
        showCustomConfirm('全部下架', '確定要將彈窗內勾選的行程「全部下架」嗎？', false, '.modal-plan-checkbox');
    });

}); 