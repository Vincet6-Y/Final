document.addEventListener('DOMContentLoaded', () => {
    const titleEl = document.getElementById('article-title');
    const classEl = document.getElementById('article-class');
    const contentEl = document.getElementById('markdown-content');

    // 判斷網址是不是包含 "preview" (代表現在是預覽模式)
    const isPreviewMode = window.location.pathname.includes("/admin/articles/preview");

    if (isPreviewMode) {
        const previewDataStr = sessionStorage.getItem('articlePreview');
        if (previewDataStr) {
            const data = JSON.parse(previewDataStr);
            if (titleEl) titleEl.innerText = data.title || "未命名文章";
            if (classEl) classEl.innerText = data.articleClass || "未分類";
            if (contentEl) contentEl.innerHTML = renderContent(data.content || "");
        }
    } else {
        const rawContent = contentEl?.getAttribute('data-markdown') || "";
        if (contentEl) contentEl.innerHTML = renderContent(rawContent);
    }
});

/**
 * renderContent()
 * 有 Markdown 標記 → marked 解析
 * 純文字 → autoLayout 自動排版
 */
function renderContent(raw) {
    if (!raw) return "";
    const hasMarkdown = /^#{1,4}\s|^\*\*|^>\s|^[-*]\s|^\d+\.\s/m.test(raw);
    return hasMarkdown ? marked.parse(raw) : autoLayout(raw);
}

/**
 * autoLayout()
 * 把純文字段落智慧升格為有層次的 HTML
 */
function autoLayout(text) {
    const blocks = text.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
    let html = "";
    blocks.forEach(block => {
        const lines = block.split(/\n/).map(l => l.trim()).filter(Boolean);
        lines.forEach(line => { html += classifyLine(line); });
    });
    return html;
}

/**
 * classifyLine()：對每行決定 HTML 標籤
 */
function classifyLine(line) {
    // 1. 小貼士 / 注意 / 提醒 → blockquote
    if (/^[「【]?(小貼士|注意|提醒|溫馨提醒|重要|警告)/.test(line)) {
        return `<blockquote><strong>${line}</strong></blockquote>\n`;
    }

    // 2. 引號包住的完整句子 → blockquote 引用
    if (/^[「『""]/.test(line) && /[」』""]$/.test(line)) {
        return `<blockquote>${line}</blockquote>\n`;
    }

    // 3. 短句標題（≤18字、無標點）或冒號結尾 → h3
    const isShortTitle = line.length <= 18 && !/[。，,.?？!！]/.test(line);
    const isColonEnd = /[:：]$/.test(line);
    if (isShortTitle || isColonEnd) {
        return `<h3>${line.replace(/[:：]$/, "")}</h3>\n`;
    }

    // 4. 「關鍵詞：內容」格式 → 粗體標籤
    const colonMatch = line.match(/^(.{1,15}[：:])(.+)$/);
    if (colonMatch) {
        return `<p><strong>${colonMatch[1]}</strong>${colonMatch[2]}</p>\n`;
    }

    // 5. 一般段落
    return `<p>${line}</p>\n`;
}
