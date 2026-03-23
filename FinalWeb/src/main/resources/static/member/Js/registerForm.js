$(function () {
    $('#registerForm').on('submit', function (e) {
        e.preventDefault();
        console.log('submit intercepted');

        const name = $('#registerForm input[name="name"]').val();
        const email = $('#registerForm input[name="email"]').val();
        const phone = $('#registerForm input[name="phone"]').val();
        const birthday = $('#registerForm input[name="birthday"]').val();
        const passwd = $('#registerPasswd').val();
        const confirmPasswd = $('#registerConfirmPasswd').val();

        // 前端基本驗證
        if (!name || !email || !phone || !birthday || !passwd || !confirmPasswd) {
            showToast('error', '請填寫所有欄位');
            return;
        }

        // 同意條款檢查
        if (!$('#agreeTerms').is(':checked')) {
            showToast('error', '請先閱讀並同意服務條款與隱私政策');
            return;
        }

        if (!/^09\d{8}$/.test(phone)) {
            showToast('error', '手機號碼格式不正確');
            return;
        }

        const birthdayDate = new Date(birthday);
        const today = new Date();
        const minDate = new Date('1900-01-01');

        if (birthdayDate > today) {
            showToast('error', '生日不能是未來日期');
            return;
        }

        if (birthdayDate < minDate) {
            showToast('error', '請輸入正確的生日');
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
                    sessionStorage.setItem('toastType', 'success');
                    sessionStorage.setItem('toastMessage', response.message);
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