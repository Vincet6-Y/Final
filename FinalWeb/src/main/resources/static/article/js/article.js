document.addEventListener('DOMContentLoaded', () => {
    const titleEl = document.getElementById('article-title');
    const classEl = document.getElementById('article-class');
    const contentEl = document.getElementById('markdown-content');

    // 判斷是否為後台預覽模式
    const isPreviewMode = window.location.pathname.includes("/admin/articles/preview");

    if (isPreviewMode) {
        const previewDataStr = sessionStorage.getItem('articlePreview');
        if (previewDataStr) {
            const data = JSON.parse(previewDataStr);

            // ✅ 設定標題、分類、內容
            if (titleEl) titleEl.innerText = data.title || "未命名文章";
            if (classEl) classEl.innerText = data.articleClass || "未分類";
            if (contentEl) contentEl.innerHTML = renderContent(data.content || "");

            // ✅ 設定 Hero Banner 背景圖
            if (data.articleImageUrl) {
                const fallbackBg = document.getElementById('hero-bg-fallback');
                if (fallbackBg) {
                    fallbackBg.style.backgroundImage = `url(${data.articleImageUrl})`;
                }
            }

            // ✅ 預覽模式：返回按鈕改為返回編輯頁面
            const backLink = document.getElementById('back-link');
            if (backLink) {
                if (data.editId) {
                    backLink.href = `/backend/backendarticle?editId=${data.editId}`;
                } else {
                    backLink.href = `/backend/backendarticle`;
                }
                const backText = backLink.querySelector('#back-text');
                if (backText) backText.innerText = '返回編輯畫面';
            }
        }
    } else {
        // ✅ 正常前端瀏覽模式 — 從 data-markdown 取出內容渲染
        const rawContent = contentEl?.getAttribute('data-markdown') || "";
        if (contentEl) contentEl.innerHTML = renderContent(rawContent);
    }
});

/**
 * renderContent()
 * 判斷內容類型：
 * - 有 HTML 標籤 → 直接當 HTML 顯示
 * - 有 Markdown 語法 → 用 marked 解析（相容舊資料）
 * - 純文字 → 換行轉 <p> 段落
 */
function renderContent(raw) {
    if (!raw) return "";

    // 1. 如果已經是 HTML（WYSIWYG 產出），直接返回
    if (/<[a-z][\s\S]*>/i.test(raw)) {
        return raw;
    }

    // 2. 如果有 Markdown 語法（舊資料相容），用 marked 解析
    if (typeof marked !== 'undefined' && /^#{1,4}\s|^\*\*|^>\s|^[-*]\s|^\d+\.\s/m.test(raw)) {
        return marked.parse(raw);
    }

    // 3. 純文字 → 每段落包 <p>
    return raw
        .split(/\n{2,}/)
        .map(p => p.trim())
        .filter(Boolean)
        .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('\n');
}
