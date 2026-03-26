// 1. 動畫執行邏輯 (共用)
function runToastAnimation() {
    const $toast = $("#toast");
    if ($toast.length === 0) return;

    // 確保有過場動畫屬性
    $toast.addClass("transition-all duration-300 ease-in-out");

    // 延遲 10 毫秒，觸發滑入動畫
    setTimeout(function () {
        $toast.removeClass("opacity-0 -translate-y-6 scale-95")
            .addClass("opacity-100 translate-y-0 scale-100");
    }, 10);

    // 2.5 秒後，觸發滑出動畫
    setTimeout(function () {
        $toast.removeClass("opacity-100 translate-y-0 scale-100")
            .addClass("opacity-0 -translate-y-6 scale-95");

        // 等待動畫結束後移除 DOM
        setTimeout(function () {
            $toast.remove();
        }, 500);
    }, 2500);
}

// 2. 供 AJAX 呼叫的動態生成邏輯 (對齊你的 Thymeleaf 樣式)
window.showToast = function (type, message) {
    // 移除畫面上舊的 toast
    $('#toast').remove();

    let bgColor = type === 'success' ? 'bg-emerald-500' : (type === 'error' ? 'bg-red-500' : 'bg-slate-700');
    let icon = type === 'success' ? 'check_circle' : (type === 'error' ? 'error' : 'info');

    const toastHtml = `
        <div id="toast" class="fixed top-40 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg text-white opacity-0 -translate-y-6 scale-95 w-max max-w-[90vw] ${bgColor}">
            <span class="material-symbols-outlined text-lg shrink-0">${icon}</span>
            <span class="font-medium">${message}</span>
        </div>
    `;

    $('body').append(toastHtml);
    runToastAnimation();
};

// 3. 處理網頁載入時的 Thymeleaf Toast
$(document).ready(function () {
    if ($("#toast").length > 0) {
        runToastAnimation();
    }
    const toastType = sessionStorage.getItem('toastType');
    const toastMessage = sessionStorage.getItem('toastMessage');
    if (toastType && toastMessage) {
        sessionStorage.removeItem('toastType');
        sessionStorage.removeItem('toastMessage');
        showToast(toastType, toastMessage);
    }
});