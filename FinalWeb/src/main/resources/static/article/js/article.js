document.addEventListener('DOMContentLoaded', () => {
    const titleEl = document.getElementById('article-title');
    const classEl = document.getElementById('article-class');
    const contentEl = document.getElementById('markdown-content');

    //前台 / 後台共用頁面設計
    const isPreviewMode = window.location.pathname.includes("/admin/articles/preview");

    if (isPreviewMode) {
        // ==========================================
        // 後台預覽模式 — 從 sessionStorage 讀取預覽資料
        // ==========================================
        const previewDataStr = sessionStorage.getItem('articlePreview');
        if (previewDataStr) {
            const data = JSON.parse(previewDataStr);
            if (titleEl) titleEl.innerText = data.title || "未命名文章";
            if (classEl) classEl.innerText = data.articleClass || "未分類";
            if (contentEl) contentEl.innerHTML = renderMarkdown(data.content || "");

            // 設定封面圖片
            if (data.articleImageUrl) {
                const fallbackBg = document.getElementById('hero-bg-fallback');
                if (fallbackBg) {
                    fallbackBg.style.backgroundImage = `url(${data.articleImageUrl})`;
                    fallbackBg.style.backgroundSize = 'cover';
                    fallbackBg.style.backgroundPosition = 'center';
                }
            }

            // 返回按鈕 → 返回編輯畫面
            const backLink = document.getElementById('back-link');
            if (backLink) {
                backLink.href = data.editId
                    ? `/backend/backendarticle?editId=${data.editId}`
                    : `/backend/backendarticle`;
                const backText = backLink.querySelector('#back-text');
                if (backText) backText.innerText = '返回編輯畫面';
            }
        }
    } else {
        // ==========================================
        // 正常前端瀏覽模式
        // ==========================================
        const rawContent = contentEl?.getAttribute('data-markdown') || "";
        if (contentEl) contentEl.innerHTML = renderMarkdown(rawContent);
    }
});

/**
 * renderMarkdown:
 */
function renderMarkdown(raw) {
    if (!raw) return "";

    if (typeof marked !== 'undefined') {
        return marked.parse(raw);
    }

    // fallback
    return raw.split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('\n');
}
