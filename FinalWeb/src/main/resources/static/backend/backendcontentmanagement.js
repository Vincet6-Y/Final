//文章發布與管理
$(document).ready(function () {
    fetchLatestArticles();
});
function fetchLatestArticles() {
    // 呼叫你的 API，取得最新的 5 篇文章 (size=5)
    $.ajax({
        url: "/admin/articles?page=0&size=5",
        method: "GET",
        success: function (response) {
            const tbody = $("#articleTableBody");
            tbody.empty();
            const articles = response.content;
            if (articles.length === 0) {
                tbody.append('<tr><td colspan="5" class="text-center py-4 text-slate-500">目前尚無文章</td></tr>');
                return;
            }

            // 跑迴圈生成每一列
            articles.forEach(function (article) {
                // 判斷狀態與顏色
                let statusHtml = '';
                if (article.status === 'published') {
                    statusHtml = `<span class="flex items-center gap-1.5 text-xs text-green-500">
                                        <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span> 已發布
                                      </span>`;
                } else {
                    statusHtml = `<span class="flex items-center gap-1.5 text-xs text-amber-500">
                                        <span class="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> 草稿
                                      </span>`;
                }

                // 處理時間 (若無更新時間則顯示建立時間)
                let timeDisplay = article.updatedTime ? article.updatedTime : (article.createdTime ? article.createdTime : '剛剛');

                // 為了美觀，我們截斷時間的小數點部分 (例如 2026-03-10T14:30:00)
                if (timeDisplay && timeDisplay.includes('T')) {
                    timeDisplay = timeDisplay.split('T')[0];
                }

                // 組裝單行的 HTML
                const tr = `
                        <tr class="hover:bg-primary/5 transition-colors">
                            <td class="px-6 py-4">
                                <p class="text-sm font-medium">${article.title}</p>
                                <p class="text-[10px] text-slate-500 mt-0.5">最後編輯: ${timeDisplay}</p>
                            </td>
                            <td class="px-6 py-4">
                                <span class="text-xs text-primary bg-primary/10 px-2 py-1 rounded">${article.articleClass || '未分類'}</span>
                            </td>
                            <td class="px-6 py-4 text-sm">管理員 A</td>
                            <td class="px-6 py-4">
                                ${statusHtml}
                            </td>
                            <td class="px-6 py-4 text-right">
                                <button class="material-symbols-outlined text-slate-400 hover:text-primary transition-colors">more_horiz</button>
                            </td>
                        </tr>
                    `;
                tbody.append(tr);
            });
        },
        error: function () {
            console.error("無法取得文章列表");
        }
    });
}
