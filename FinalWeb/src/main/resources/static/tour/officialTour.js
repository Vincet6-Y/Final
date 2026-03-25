async function toggleFavorite(btn, planId) {
    try {
        const response = await fetch(`/api/favorites/toggle/${planId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.status === 401) {
            alert('需登入才能收藏行程唷！');
            window.location.href = `/auth?redirect=${encodeURIComponent(window.location.pathname)}`;
            return;
        }

        const data = await response.json();

        if (data.success) {
            const icon = btn.querySelector('span');

            if (data.isFavorited) {
                icon.style.fontVariationSettings = "'FILL' 1";
                btn.classList.add('text-primary');
                btn.classList.remove('text-slate-400', 'dark:text-slate-300');
            } else {
                icon.style.fontVariationSettings = "'FILL' 0";
                btn.classList.remove('text-primary');
                btn.classList.add('text-slate-400', 'dark:text-slate-300');
            }
        } else {
            alert('操作失敗：' + data.message);
        }
    } catch (error) {
        console.error("收藏操作發生錯誤:", error);
    }
}

// ==========================================
// 🌟 行程卡片：天數篩選 + 關鍵字模糊搜尋雙重連動
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    const filters = document.querySelectorAll('.day-filter');
    const searchInput = document.getElementById('searchInput');
    const cards = document.querySelectorAll('.tour-card');
    const noResultsMsg = document.getElementById('no-results-msg');

    // 核心過濾器函式
    function applyFilters() {
        // 1. 取得目前選中的天數 (抓取第一個 checked 的元素，因為手機與桌面已經同步)
        const activeDayFilter = document.querySelector('.day-filter:checked');
        const selectedDays = activeDayFilter ? activeDayFilter.value : 'all';

        // 2. 取得搜尋關鍵字 (轉小寫並去除前後空白)
        const keyword = searchInput ? searchInput.value.trim().toLowerCase() : '';

        let visibleCount = 0; // 紀錄顯示的卡片數量

        cards.forEach(card => {
            // 從我們剛剛在 HTML 設定的屬性抓取資料
            const cardDays = card.getAttribute('data-days');
            const cardKeyword = card.getAttribute('data-keyword').toLowerCase();

            // 條件 1: 天數符合 ('all' 或是 天數一致)
            const matchDays = (selectedDays === 'all' || cardDays === selectedDays);

            // 條件 2: 關鍵字符合 (如果輸入框是空的，或者卡片的隱藏關鍵字包含輸入的文字)
            const matchKeyword = (keyword === '' || cardKeyword.includes(keyword));

            // 必須同時符合「天數」與「關鍵字」才會顯示
            if (matchDays && matchKeyword) {
                card.style.display = 'flex';
                visibleCount++;

                // 動畫效果：如果是原本隱藏的，給它一個淡淡的浮現效果
                if (card.style.opacity === '0' || card.style.opacity === '') {
                    card.style.opacity = '0';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transition = 'opacity 0.3s ease';
                    }, 10);
                } else {
                    card.style.opacity = '1';
                }
            } else {
                // 不符合則隱藏
                card.style.display = 'none';
                card.style.opacity = '0';
            }
        });

        // 判斷是否需要顯示「無搜尋結果」提示
        if (visibleCount === 0) {
            noResultsMsg.classList.remove('hidden');
        } else {
            noResultsMsg.classList.add('hidden');
        }
    }

    // 監聽：點擊天數按鈕
    filters.forEach(filter => {
        filter.addEventListener('change', function () {
            const selectedValue = this.value;

            // 同步手機版和桌面版 Radio 的選取狀態
            filters.forEach(f => {
                if (f.value === selectedValue) {
                    f.checked = true;
                }
            });

            // 觸發篩選
            applyFilters();
        });
    });

    // 監聽：在搜尋框打字 (使用 'input' 事件能做到即時搜尋)
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }
});