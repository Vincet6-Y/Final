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
        // 2. 簡單的前端防呆 (避免空值發送)
        if (!currentPasswd || !newPasswd || !confirmPasswd) {
            alert('請填寫所有密碼欄位！');
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
            url: '/member/change-passwd', // 對應後端的 API 網址
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(data),
            success: function (response) {
                // Controller 回傳 200 OK 會進來這裡
                alert(response); // 顯示「密碼修改成功」
                // 清空輸入框並關閉 Modal (視你的 UI 需求而定)
                $('#currentPasswd, #newPasswd, #confirmPasswd').val('');
                $('#closeAccountModal').click();
            },
            error: function (xhr) {
                // Controller 回傳 400 Bad Request 會進來這裡
                alert('錯誤：' + xhr.responseText);
            }
        });
    });
});