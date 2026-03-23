$(function () {
    $('#registerForm').on('submit', function (e) {
        e.preventDefault();

        const name = $('input[name="name"]').val();
        const email = $('input[name="email"]').val();
        const phone = $('input[name="phone"]').val();
        const birthday = $('input[name="birthday"]').val();
        const passwd = $('#registerPasswd').val();
        const confirmPasswd = $('#registerConfirmPasswd').val();

        // 前端基本驗證
        if (!name || !email || !phone || !birthday || !passwd || !confirmPasswd) {
            showToast('error', '請填寫所有欄位');
            return;
        }

        if (!/^09\d{8}$/.test(phone)) {
            showToast('error', '手機號碼格式不正確');
            return;
        }

        if (passwd.length < 8) {
            showToast('error', '密碼至少需要 8 個字元');
            return;
        }

        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(passwd)) {
            showToast('error', '密碼需包含大小寫英文及數字');
            return;
        }

        if (passwd !== confirmPasswd) {
            showToast('error', '兩次輸入的密碼不一致');
            return;
        }

        $.ajax({
            url: '/auth/register',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                name: name,
                email: email,
                phone: phone,
                birthday: birthday,
                passwd: passwd,
                confirmPasswd: confirmPasswd
            }),
            success: function (response) {
                if (response.success) {
                    window.location.href = response.redirectUrl;
                } else {
                    showToast('error', response.message);
                }
            },
            error: function () {
                showToast('error', '系統發生錯誤，請稍後再試');
            }
        });
    });
});