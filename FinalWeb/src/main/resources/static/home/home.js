    /**
     * 1. 載入首頁日本百科小卡片 (包含圖片顯示)
     */
    async function loadJapanWikiInfo() {
        const container = document.getElementById('content-japan');
        if (!container) return;

        // 預設想在首頁展示的日本地點
        const defaultLocations = ['富士山',' 中部地方', '長崎', '大阪', '福岡'];
        
        try {
            container.innerHTML = ''; // 清空載入中狀態 (如原本的 Skeleton)

            for (const location of defaultLocations) {
                try {
                    // 呼叫後端 WikiController API
                    const response = await fetch(`/api/wiki/info?title=${encodeURIComponent(location)}`);
                    if (!response.ok) continue;
                    
                    const data = await response.json();
                    
                    // 摘要文字處理：去除 HTML 標籤並擷取前 100 字
                    const plainText = data.extract ? data.extract.replace(/<[^>]*>/g, '') : "暫無介紹。";
                    const textSummary = plainText.substring(0, 100);

                    // 渲染百科卡片 (圖片在上方，文字在下方)
                    const wikiCard = `
                        <div onclick="openWikiModal('${location}')" 
                             class="min-w-[280px] max-w-[320px] bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-0 shadow-sm hover:border-primary/50 transition-all flex flex-col group cursor-pointer overflow-hidden">
                            
                            ${data.imageUrl ? `
                                <div class="h-44 w-full overflow-hidden border-b border-white/10">
                                    <img src="${data.imageUrl}" 
                                         alt="${location}" 
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
                                    <span class="flex items-center gap-1 text-primary text-xs font-bold hover:gap-2 transition-all">
                                        查看詳細介紹 <span class="material-symbols-outlined text-xs">arrow_forward</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;
                    container.innerHTML += wikiCard;
                } catch (err) {
                    console.error(`${location} 載入失敗:`, err);
                }
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

        titleArea.innerText = locationName + " - 景點介紹";
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        contentArea.innerHTML = '<div class="flex justify-center p-10">載入中...</div>';

        try {
            const response = await fetch(`/api/wiki/info?title=${encodeURIComponent(locationName)}`);
            const data = await response.json();

            // 組合內容：文字介紹
            let htmlResponse = `<div class="wiki-text-section text-slate-300 leading-relaxed text-sm md:text-base">${data.extract}</div>`;
            
            // 圖片顯示在文字下方
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
            contentArea.innerHTML = `<div class="text-red-500 p-4 text-center">讀取失敗，請稍後再試</div>`;
        }
    }

    /**
     * 3. 關閉彈窗
     */
    function closeWikiModal() {
        const modal = document.getElementById('wikiModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    }

    /**
     * 4. 頁面初始化監聽
     */
    document.addEventListener('DOMContentLoaded', function () {
        // 載入日本百科資料
        loadJapanWikiInfo();

        // 搜尋按鈕功能
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');
        
        if(searchBtn && searchInput) {
            searchBtn.addEventListener('click', function () {
                const keyword = searchInput.value.trim();
                if (!keyword) return;

                fetch(`/api/search?keyword=${encodeURIComponent(keyword)}`)
                    .then(response => {
                        if (!response.ok) throw new Error("找不到作品");
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

    /**
     * 5. Tab 切換功能 (日本百科 vs 外交部資訊)
     */
    function showContent(tab) {
        const japanContent = document.getElementById('content-japan');
        const mofaContent = document.getElementById('content-mofa');
        const btnJapan = document.getElementById('btn-japan');
        const btnMofa = document.getElementById('btn-mofa');

        if (!japanContent || !mofaContent) return;

        if (tab === 'japan') {
            japanContent.classList.remove('hidden');
            japanContent.classList.add('flex');
            mofaContent.classList.add('hidden');
            // 切換按鈕樣式
            btnJapan.className = "flex flex-col items-center justify-center h-48 bg-slate-200 dark:bg-white/10 border-2 border-primary rounded-2xl text-slate-900 dark:text-white transition-all shadow-lg group";
            btnMofa.className = "flex flex-col items-center justify-center h-48 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-400 hover:border-primary/50 hover:text-primary transition-all group shadow-sm";
        } else {
            japanContent.classList.add('hidden');
            japanContent.classList.remove('flex');
            mofaContent.classList.remove('hidden');
            // 切換按鈕樣式
            btnMofa.className = "flex flex-col items-center justify-center h-48 bg-slate-200 dark:bg-white/10 border-2 border-primary rounded-2xl text-slate-900 dark:text-white transition-all shadow-lg group";
            btnJapan.className = "flex flex-col items-center justify-center h-48 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-400 hover:border-primary/50 hover:text-primary transition-all group shadow-sm";
        }
    }

    /**
 * 處理日本資訊區域的水平捲動
 * @param {string} direction - 'left' 或 'right'
 */
function scrollJapan(direction) {
    const container = document.getElementById('content-japan');
    if (!container) return;

    // 捲動距離建議設為一張卡片的寬度 (224px) 加上 gap (20px)
    const scrollAmount = 250; 
    
    if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
}
