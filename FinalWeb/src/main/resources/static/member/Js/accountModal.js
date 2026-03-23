$(function () {
    const $openAccountModal = $("#openAccountModal");
    const $accountModal = $("#accountModal");
    const $closeAccountModal = $("#closeAccountModal");
    const $accountModalBackdrop = $("#accountModalBackdrop");
    const $memberMenu = $("#memberMenu");

    function openModal() {
        $accountModal.removeClass("hidden");
        $("body").addClass("overflow-hidden");
    }

    function closeModal() {
        $accountModal.addClass("hidden");
        $("body").removeClass("overflow-hidden");
    }

    if ($openAccountModal.length) {
        $openAccountModal.on("click", function () {
            $memberMenu.addClass("hidden");
            openModal();
        });
    }

    if ($closeAccountModal.length) {
        $closeAccountModal.on("click", function () {
            closeModal();
        });
    }

    if ($accountModalBackdrop.length) {
        $accountModalBackdrop.on("click", function () {
            closeModal();
        });
    }

    $(document).on("keydown", function (e) {
        if (e.key === "Escape") {
            closeModal();
        }
    });

    $(".accordion-content").hide();

    $(".accordion-btn").on("click", function () {
        const $button = $(this);
        const $content = $button.next(".accordion-content");
        const $icon = $button.find(".accordion-icon");
        const isVisible = $content.is(":visible");

        $(".accordion-content").not($content).stop(true, true).slideUp(200);
        $(".accordion-icon").not($icon).text("expand_more");

        if (isVisible) {
            $content.stop(true, true).slideUp(200);
            $icon.text("expand_more");
        } else {
            $content.stop(true, true).slideDown(200);
            $icon.text("expand_less");
        }
    });
});


// ===== 新增：密碼顯示/隱藏切換邏輯 =====
$(document).ready(function () {
    $('.toggle-password').on('click', function () {
        // 尋找跟這顆按鈕在同一個 div 裡面的 input
        const $input = $(this).siblings('input');
        // 尋找這顆按鈕裡面的 span 圖示
        const $icon = $(this).find('span');
        // 判斷目前的 input type
        if ($input.attr('type') === 'password') {
            // 改成明文
            $input.attr('type', 'text');
            // 更換成睜開眼睛的圖示
            $icon.text('visibility');
            $icon.addClass('text-orange-500').removeClass('text-slate-400'); // 點亮圖示顏色
        } else {
            // 改回密碼遮罩
            $input.attr('type', 'password');
            // 更換成閉上眼睛的圖示
            $icon.text('visibility_off');
            $icon.addClass('text-slate-400').removeClass('text-orange-500'); // 恢復圖示顏色
        }
    });

    // ===== 更新密碼邏輯 =====
    $('#savePasswdBtn').on('click', function () {
        // 1. 取得輸入框的值
        const currentPasswd = $('#currentPasswd').val();
        const newPasswd = $('#newPasswd').val();
        const confirmPasswd = $('#confirmPasswd').val();
        // 2. 空值檢查
        if (!currentPasswd || !newPasswd || !confirmPasswd) {
            showToast('error', '請填寫所有密碼欄位！');
            return;
        }

        // 長度檢查
        if (newPasswd.length < 8) {
            showToast('error', '新密碼至少需要 8 個字元');
            return;
        }

        // 複雜度檢查
        const passwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwdRegex.test(newPasswd)) {
            showToast('error', '密碼需包含大小寫英文及數字');
            return;
        }

        // 確認密碼是否一致
        if (newPasswd !== confirmPasswd) {
            showToast('error', '新密碼與確認密碼不一致');
            return;
        }

        // 3. 準備送給後端的 DTO 資料
        const data = {
            currentPasswd: currentPasswd,
            newPasswd: newPasswd,
            confirmPasswd: confirmPasswd
        };
        // 4. 發送 AJAX 請求
        $.ajax({
            url: '/member/change-passwd',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function (response) {
                // Controller 回傳 200 OK 會進來這裡
                // 1. 這裡的 response 已經是一個 JSON 物件：{ type: "success", message: "密碼修改成功" }
                $('#closeAccountModal').click();
                $('#currentPasswd, #newPasswd, #confirmPasswd').val('');
                showToast(response.type, response.message);
            },
            error: function (xhr) {
                // Controller 回傳 400 或 401 會進來這裡
                const errorData = xhr.responseJSON;
                // 防呆檢查：如果後端確實有回傳 JSON，就顯示 DTO 裡的 message
                if (errorData && errorData.message) {
                    showToast(errorData.type, errorData.message);
                } else {
                    // 如果發生預期外的錯誤（例如伺服器掛掉 500），顯示預設錯誤
                    showToast('error', '系統發生錯誤，請稍後再試');
                }
            }
        });
    });
});