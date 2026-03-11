//  日本旅遊即時資訊 

const UPDATE_INTERVAL = 300000;
document.addEventListener('DOMContentLoaded', () => {
    fetchJapanAlerts();
    setInterval(fetchJapanAlerts, UPDATE_INTERVAL);
});

async function fetchJapanAlerts() {
    const container = document.getElementById('alert-container');
    if (!container) return; // 思考邏輯：預防此 JS 被引入到沒有 alert-container 的頁面而噴錯

    try {
        const response = await fetch('/api/travel/japan');
        if (!response.ok) throw new Error("網路回應不正確");
        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
            container.innerHTML = '<p class="text-slate-500 text-sm italic">目前無最新警示</p>';
            return;
        }

        let html = '';
        data.forEach(item => {
            html += `
                <div class="p-6 bg-background-dark/5 dark:bg-background-dark/50 border border-slate-200 dark:border-white/10 rounded-xl transition-all hover:border-primary/30 mb-4">
                    <div class="flex justify-between items-center mb-3">
                        <div class="flex items-center gap-2">
                            <span class="text-primary text-[10px] font-bold px-2 py-0.5 bg-primary/10 rounded">最新動態</span>
                            <h5 class="text-slate-900 dark:text-white font-bold text-sm m-0">${item.title}</h5>
                        </div>
                        <span class="text-slate-500 text-[10px]">${item.pubDate || ''}</span>
                    </div>
                    <div class="text-slate-600 dark:text-slate-400 text-xs leading-normal m-0 p-0">
                        ${item.description}
                    </div>
                </div>
            `;
        });

        // 思考邏輯：僅在內容改變時更新 DOM，減少重繪（Repaint）
        if (container.innerHTML !== html) {
            container.innerHTML = html;
        }
    } catch (err) {
        console.error("更新失敗", err);
        container.innerHTML = '<p class="text-red-400 text-xs italic">暫時無法取得警示資訊</p>';
    }
}