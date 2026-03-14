async function toggleFavorite(btn, planId) {
    try {
        // 發送 API 請求給後端
        const response = await fetch(`/api/favorites/toggle/${planId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        // 🌟 核心邏輯：如果後端回傳 401 (未授權)，跳出提醒並導向登入頁
        if (response.status === 401) {
            alert('需登入才能收藏行程唷！');
            // 將目前的網址帶入 redirect 參數，登入後可以跳回來
            window.location.href = `/auth?redirect=${encodeURIComponent(window.location.pathname)}`;
            return;
        }

        const data = await response.json();
        
        if (data.success) {
            // 抓取按鈕內的 icon 元素
            const icon = btn.querySelector('span');
            
            if (data.isFavorited) {
                // 變成實心 + 橘色
                icon.style.fontVariationSettings = "'FILL' 1";
                btn.classList.add('text-primary');
                btn.classList.remove('text-slate-400', 'dark:text-slate-500');
            } else {
                // 變成空心 + 灰色
                icon.style.fontVariationSettings = "'FILL' 0";
                btn.classList.remove('text-primary');
                btn.classList.add('text-slate-400', 'dark:text-slate-500');
            }
        } else {
            alert('操作失敗：' + data.message);
        }
    } catch (error) {
        console.error("收藏操作發生錯誤:", error);
    }

// ==========================================
// 🌟 行程卡片天數篩選邏輯
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const radioFilters = document.querySelectorAll('input[name="dayCount"]');
    const cards = document.querySelectorAll('.tour-card');

    radioFilters.forEach(radio => {
        radio.addEventListener('change', () => {
            const selectedValue = radio.value; // 'all', '3', 或 '5'

            cards.forEach(card => {
                const cardDays = card.getAttribute('data-days');

                if (selectedValue === 'all' || cardDays === selectedValue) {
                    card.style.display = 'block'; // 顯示符合天數的卡片
                } else {
                    card.style.display = 'none'; // 隱藏不符合的
                }
            });
        });
    });
});

}