
document.addEventListener('DOMContentLoaded', () => {
    const titleEl = document.getElementById('article-title');
    const classEl = document.getElementById('article-class');
    const contentEl = document.getElementById('markdown-content');

    // 判斷網址是不是包含 "preview" (代表現在是預覽模式)
    const isPreviewMode = window.location.href.includes("preview");

    if (isPreviewMode) {
        // ==========================================
        // 【預覽模式】：從 sessionStorage 拿暫存資料來貼上
        // ==========================================
        const previewDataStr = sessionStorage.getItem('articlePreview');
        if (previewDataStr) {
            const data = JSON.parse(previewDataStr);

            // 替換標題與分類
            if (titleEl) titleEl.innerText = data.title || "未命名文章";
            if (classEl) classEl.innerText = data.articleClass || "未分類";

            // 替換並解析 Markdown 內容
            if (contentEl) contentEl.innerHTML = marked.parse(data.content || "沒有內容...");
        }

    } else {
        // ==========================================
        // 【正常觀看模式】：從 Thymeleaf 塞入的 data-markdown 拿資料
        // ==========================================
        const rawMarkdown = contentEl.getAttribute('data-markdown');
        if (rawMarkdown) {
            contentEl.innerHTML = marked.parse(rawMarkdown);
        }
    }
});
