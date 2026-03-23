/**
 * 1. 載入首頁日本百科小卡片 (包含圖片顯示)
 */
async function loadJapanWikiInfo() {
    const container = document.getElementById('content-japan');
    if (!container) return;

    const defaultLocations = ['富士山', '中部地方', '長崎', '大阪', '福岡'];

    try {
        container.innerHTML = '';

        // 平行請求，不用一個等一個
        const results = await Promise.allSettled(
            defaultLocations.map(location =>
                fetch(`/api/wiki/info?title=${encodeURIComponent(location)}`)
                    .then(r => r.ok ? r.json() : null)
                    .then(data => ({ location, data }))
            )
        );

        results.forEach(result => {
            if (result.status !== 'fulfilled' || !result.value.data) return;

            const { location, data } = result.value;
            const plainText = data.extract ? data.extract.replace(/<[^>]*>/g, '') : '暫無介紹。';
            const textSummary = plainText.substring(0, 100);

            container.innerHTML += `
                <div onclick="openWikiModal('${location}')" 
                    class="min-w-[280px] max-w-[320px] bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-0 shadow-sm hover:border-primary/50 transition-all flex flex-col group cursor-pointer overflow-hidden">
                    ${data.imageUrl ? `
                        <div class="h-44 w-full overflow-hidden border-b border-white/10">
                            <img src="${data.imageUrl}" alt="${location}" 
                                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                        </div>
                    ` : `
                        <div class="h-44 w-full bg-white/5 flex items-center justify-center border-b border-white/10">
                            <span class="material-symbols-outlined text-white/10 text-5xl">landscape</span>
                        </div>
                    `}
                    <div class="p-5 flex-1 flex flex-col justify-between">
                        <div>
                            <div class="flex items-center gap-2 mb-3">
                                <span class="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded uppercase tracking-wider">旅遊百科</span>
                                <span class="text-slate-500 text-[10px]">Wikivoyage</span>
                            </div>
                            <h5 class="text-slate-200 group-hover:text-primary text-base font-bold leading-snug line-clamp-2 transition-colors">
                                ${location}
                            </h5>
                            <div class="mt-3 text-slate-400 text-xs line-clamp-3 leading-relaxed">
                                ${textSummary}...
                            </div>
                        </div>
                        <div class="pt-4 mt-4 border-t border-white/5 flex items-center justify-end">
                            <span class="flex items-center gap-1 text-primary text-xs font-bold">
                                查看詳細介紹 <span class="material-symbols-outlined text-xs">arrow_forward</span>
                            </span>
                        </div>
                    </div>
                </div>
            `;
        });

        if (!container.innerHTML.trim()) {
            container.innerHTML = '<div class="text-slate-400 p-8 text-sm">暫無資料</div>';
        }

    } catch (error) {
        console.error('百科載入錯誤:', error);
        container.innerHTML = '<div class="text-red-400 p-8 text-sm">無法獲取百科資訊，請檢查後端服務</div>';
    }
}

/**
 * 2. 開啟百科詳細介紹彈窗 (文字在上，圖片在下)
 */
async function openWikiModal(locationName) {
    const modal = document.getElementById('wikiModal');
    const contentArea = document.getElementById('wikiContent');
    const titleArea = document.getElementById('wikiTitle');

    if (!modal || !contentArea || !titleArea) return;

    titleArea.innerText = locationName + ' - 景點介紹';
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    contentArea.innerHTML = '<div class="flex justify-center p-10">載入中...</div>';

    try {
        const response = await fetch(`/api/wiki/info?title=${encodeURIComponent(locationName)}`);
        const data = await response.json();

        let htmlResponse = `<div class="wiki-text-section text-slate-300 leading-relaxed text-sm md:text-base">${data.extract}</div>`;

        if (data.imageUrl) {
            htmlResponse += `
                <div class="mt-8 w-full flex justify-center">
                    <img src="${data.imageUrl}" 
                         alt="${locationName}" 
                         class="rounded-xl shadow-2xl max-w-full h-auto border border-white/10"
                         style="max-height: 450px; object-fit: contain;">
                </div>`;
        }

        contentArea.innerHTML = htmlResponse;

    } catch (error) {
        console.error(error);
        contentArea.innerHTML = '<div class="text-red-500 p-4 text-center">讀取失敗，請稍後再試</div>';
    }
}

/**
 * 3. 關閉百科彈窗
 */
function closeWikiModal() {
    const modal = document.getElementById('wikiModal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

/**
 * 4. Tab 切換功能 (日本百科 vs 外交部資訊)
 */
function showContent(tab) {
    const japanContent = document.getElementById('content-japan');
    const mofaContent  = document.getElementById('content-mofa');
    const btnJapan     = document.getElementById('btn-japan');
    const btnMofa      = document.getElementById('btn-mofa');
    const scrollLeft    = document.getElementById('scroll-left');
    const scrollRight   = document.getElementById('scroll-right');

    if (!japanContent || !mofaContent) return;

    // active / inactive class（不含高度，高度由 HTML 控制）
    const activeClasses   = ['bg-slate-200', 'dark:bg-white/10', 'border-2', 'border-primary', 'text-primary'];
    const inactiveClasses = ['bg-white', 'dark:bg-white/5', 'border', 'border-slate-200', 'dark:border-white/10', 'text-slate-400'];

    if (tab === 'japan') {
        japanContent.classList.remove('hidden');
        japanContent.classList.add('flex');
        mofaContent.classList.add('hidden');
        btnJapan.classList.add(...activeClasses);
        btnJapan.classList.remove(...inactiveClasses);
        btnMofa.classList.add(...inactiveClasses);
        btnMofa.classList.remove(...activeClasses);
        // 顯示箭頭
        scrollLeft?.classList.remove('hidden');
        scrollRight?.classList.remove('hidden');
    } else {
        japanContent.classList.add('hidden');
        japanContent.classList.remove('flex');
        mofaContent.classList.remove('hidden');
        btnMofa.classList.add(...activeClasses);
        btnMofa.classList.remove(...inactiveClasses);
        btnJapan.classList.add(...inactiveClasses);
        btnJapan.classList.remove(...activeClasses);
        // 隱藏箭頭
        scrollLeft?.classList.add('hidden');
        scrollRight?.classList.add('hidden');
    }
}

/**
 * 5. 日本資訊區域水平捲動
 * @param {string} direction - 'left' 或 'right'
 */
function scrollJapan(direction) {
    const container = document.getElementById('content-japan');
    if (!container) return;

    const scrollAmount = 250;
    container.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
}

/**
 * 6. 頁面初始化
 */
document.addEventListener('DOMContentLoaded', function () {
    loadJapanWikiInfo();

    const searchBtn   = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');

    if (searchBtn && searchInput) {
        // Enter 鍵也可觸發搜尋
        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') searchBtn.click();
        });

        searchBtn.addEventListener('click', function () {
            const keyword = searchInput.value.trim();
            if (!keyword) return;

            fetch(`/api/search?keyword=${encodeURIComponent(keyword)}`)
                .then(response => {
                    if (!response.ok) throw new Error('找不到作品');
                    return response.json();
                })
                .then(work => {
                    window.location.href = `/workListDetail?workId=${work.workId}`;
                })
                .catch(() => {
                    window.location.href = `/workList?keyword=${encodeURIComponent(keyword)}`;
                });
        });
    }
});