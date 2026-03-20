// ==========================================
// 文章發布與管理
// ==========================================
$(document).ready(function () {

    let currentPage = 0;
    const pageSize = 10;

    // ==========================================
    // 1. 載入文章列表（支援分頁）
    // ==========================================
    function loadArticles(page = 0) {
        $.ajax({
            url: `/admin/articles?page=${page}&size=${pageSize}`,
            method: "GET",
            success: function (data) {
                renderTable(data.content);
                renderPagination(data);
                currentPage = page;
            },
            error: function () {
                showToast("error", "文章載入失敗，請重新整理");
            }
        });
    }

    // ==========================================
    // 2. 渲染表格列
    // ==========================================
    function renderTable(articles) {
        const tbody = $("#articleTableBody");
        tbody.empty();

        if (!articles || articles.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="5" class="text-center py-10 text-slate-500">目前沒有任何文章</td>
                </tr>
            `);
            return;
        }

        articles.forEach(article => {
            const statusBadge = getStatusBadge(article.status);
            const row = `
                <tr class="hover:bg-primary/5 transition-colors" data-id="${article.articleId}">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            ${article.articleImageUrl
                    ? `<img src="${article.articleImageUrl}" class="w-10 h-10 rounded object-cover flex-shrink-0" onerror="this.style.display='none'">`
                    : `<div class="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                     <span class="material-symbols-outlined text-primary text-base">article</span>
                                   </div>`
                }
                            <span class="font-medium text-sm line-clamp-1">${article.title || '未命名'}</span>
                        </div>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-400">${article.articleClass || '未分類'}</td>
                    <td class="px-6 py-4 text-sm text-slate-400">管理員</td>
                    <td class="px-6 py-4">${statusBadge}</td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-2">
                            <button class="edit-btn p-1.5 rounded-lg hover:bg-primary/20 text-slate-400 hover:text-primary transition-colors" 
                                    data-id="${article.articleId}" title="編輯">
                                <span class="material-symbols-outlined text-sm">edit</span>
                            </button>
                            <button class="toggle-status-btn p-1.5 rounded-lg hover:bg-yellow-500/20 text-slate-400 hover:text-yellow-400 transition-colors" 
                                    data-id="${article.articleId}" data-status="${article.status}" title="切換狀態">
                                <span class="material-symbols-outlined text-sm">${article.status === 'published' ? 'visibility' : 'visibility_off'}</span>
                            </button>
                            <button class="delete-btn p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors" 
                                    data-id="${article.articleId}" title="刪除">
                                <span class="material-symbols-outlined text-sm">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
    }

    // ==========================================
    // 3. 狀態 Badge 樣式
    // ==========================================
    function getStatusBadge(status) {
        if (status === 'published') {
            return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-500/15 text-green-400 border border-green-500/20">
                        <span class="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>已發布
                    </span>`;
        } else {
            return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/20">
                        <span class="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span>草稿
                    </span>`;
        }
    }

    // ==========================================
    // 4. 渲染分頁按鈕
    // ==========================================
    function renderPagination(data) {
        const container = $("#paginationContainer");
        if (!container.length) return;
        container.empty();

        if (data.totalPages <= 1) return;

        for (let i = 0; i < data.totalPages; i++) {
            const isActive = i === data.number;
            const btn = `
                <button class="page-btn w-8 h-8 rounded-lg text-sm font-bold transition-colors
                    ${isActive ? 'bg-primary text-background-dark' : 'text-slate-400 hover:bg-primary/10'}"
                    data-page="${i}">${i + 1}</button>
            `;
            container.append(btn);
        }
    }

    // ==========================================
    // 5. 事件委派：編輯、切換狀態、刪除
    // ==========================================
    $("#articleTableBody").on("click", ".edit-btn", function () {
        const id = $(this).data("id");
        // 前往編輯頁（需在 backendarticle.html 加上帶 ID 的編輯模式，這裡先導向新增頁帶 query）
        window.location.href = `/backend/backendarticle?editId=${id}`;
    });

    $("#articleTableBody").on("click", ".toggle-status-btn", function () {
        const id = $(this).data("id");
        const currentStatus = $(this).data("status");
        const newStatus = currentStatus === 'published' ? 'draft' : 'published';

        // 先取得原本文章資料再 PUT（避免覆蓋其他欄位）
        $.ajax({
            url: `/admin/articles/${id}`,
            method: "GET",
            success: function (article) {
                article.status = newStatus;
                $.ajax({
                    url: `/admin/articles/${id}`,
                    method: "PUT",
                    contentType: "application/json",
                    data: JSON.stringify(article),
                    success: function () {
                        showToast("success", newStatus === 'published' ? "文章已發布" : "已設為草稿");
                        loadArticles(currentPage);
                    },
                    error: function () {
                        showToast("error", "狀態切換失敗");
                    }
                });
            },
            error: function () {
                showToast("error", "無法取得文章資料");
            }
        });
    });

    $("#articleTableBody").on("click", ".delete-btn", function () {
        const id = $(this).data("id");
        const row = $(this).closest("tr");
        const title = row.find("span.font-medium").text();

        if (!confirm(`確定要刪除「${title}」嗎？此操作無法還原。`)) return;

        $.ajax({
            url: `/admin/articles/${id}`,
            method: "DELETE",
            success: function () {
                showToast("success", "文章已刪除");
                loadArticles(currentPage);
            },
            error: function () {
                showToast("error", "刪除失敗");
            }
        });
    });

    // ==========================================
    // 6. 分頁點擊
    // ==========================================
    $(document).on("click", ".page-btn", function () {
        loadArticles($(this).data("page"));
    });

    // ==========================================
    // 7. 初始化載入
    // ==========================================
    loadArticles(0);
});
