$(document).ready(function () {

    // 【宣告全域變數】放在最頂端，讓底下的「上傳圖」、「發布」、「草稿」都能共用這個變數
    let coverImageUrl = "";
    let currentArticleId = null; // 紀錄目前文章的 ID，避免重複新增

    // ==========================================
    // 1. 初始化 UI Editor
    // ==========================================
    const editor = new toastui.Editor({
        el: document.querySelector('#editor'), // 抓取 HTML 中的 editor div
        height: '500px',
        initialEditType: 'markdown',
        previewStyle: 'vertical',
        theme: 'dark',
        placeholder: "開始撰寫你的巡禮故事..."
    });

    // ==========================================
    // 2. 封面圖上傳邏輯
    // ==========================================
    $("#coverUpload").click(function (e) {
        // 【關鍵修正】檢查點擊目標！
        // 如果點擊的不是 input 本身，才去觸發 input 點擊，避免無限迴圈
        if (e.target.id !== 'coverInput') {
            $("#coverInput").click();
        }
    });

    $("#coverInput").change(function () {
        const file = this.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        // 上傳圖片需要告知後端分類資料，不然 controller 會報錯 (Missing required parameter 'articleClass')
        const currentClass = $("#articleClass").val() || "未分類";
        formData.append("articleClass", currentClass);

        $.ajax({
            url: "/admin/articles/upload",
            method: "POST",
            data: formData,
            processData: false,  // 告訴 jQuery 不要處理資料
            contentType: false,  // 告訴 jQuery 不要設定 Content-Type (讓 FormData 自動設定邊界)
            success: function (res) {
                coverImageUrl = res.url; // 將後端回傳的網址存入全域變數
                $("#coverPreview").attr("src", res.url).removeClass("hidden"); // 顯示預覽圖
                showToast("success", "封面上傳成功");
            }
        });
    });

    // ==========================================
    // 3. 共用函式：更新最後儲存時間
    // ==========================================
    function updateSaveTime() {
        const now = new Date();
        const time = now.getHours().toString().padStart(2, "0") + ":" +
            now.getMinutes().toString().padStart(2, "0");
        $("#saveTime").text("最後儲存：" + time);
    }

    // ==========================================
    // 4. 定時器：每 30 秒自動儲存草稿
    // ==========================================
    setInterval(function () {
        const title = $("#titleInput").val();
        const content = editor.getMarkdown();

        if (!title && !content) return; // 如果都沒填，就不自動存

        const data = {
            title: title || "未命名草稿",
            content: content,
            articleClass: $("#articleClass").val(),
            articleImageUrl: coverImageUrl,
            status: "draft"
        };

        const ajaxUrl = currentArticleId ? `/admin/articles/${currentArticleId}` : "/admin/articles";
        const ajaxMethod = currentArticleId ? "PUT" : "POST";

        $.ajax({
            url: ajaxUrl,
            method: ajaxMethod,
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function (res) {
                if (!currentArticleId && res && res.articleId) {
                    currentArticleId = res.articleId;
                }
                updateSaveTime();
            }
        });
    }, 30000);

    // ==========================================
    // 5. 按鈕邏輯：預覽、存草稿、發布
    // ==========================================
    // 預覽
    $("#previewBtn").click(function () {
        // 1. 【新增這三行】先從畫面上把資料抓下來！
        const title = $("#titleInput").val() || "未命名文章";
        const articleClass = $("#articleClass").val() || "未分類";
        const content = editor.getMarkdown() || "沒有內容...";

        // 2. 將資料組裝成物件
        const previewData = {
            title: title,
            articleClass: articleClass,
            content: content
        };

        // 3. 存入瀏覽器的 sessionStorage
        sessionStorage.setItem('articlePreview', JSON.stringify(previewData));

        // 4. 開啟新分頁，導向 Controller 提供的預覽網址
        window.open("/admin/articles/preview", "_blank");
    });

    // 儲存草稿
    $("#draftBtn").click(function () {
        const data = {
            title: $("#titleInput").val() || "未命名草稿",
            content: editor.getMarkdown(),
            articleClass: $("#articleClass").val(),
            articleImageUrl: coverImageUrl,
            status: "draft"
        };

        const ajaxUrl = currentArticleId ? `/admin/articles/${currentArticleId}` : "/admin/articles";
        const ajaxMethod = currentArticleId ? "PUT" : "POST";

        $.ajax({
            url: ajaxUrl,
            method: ajaxMethod,
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function (res) {
                if (!currentArticleId && res && res.articleId) {
                    currentArticleId = res.articleId;
                }
                showToast("success", "草稿已儲存");
                updateSaveTime();
            }
        });
    });

    // 發布文章
    $("#publishBtn").click(function () {
        const title = $("#titleInput").val();
        const content = editor.getMarkdown();
        const articleClass = $("#articleClass").val();

        // 基本的防呆檢查
        if (!title.trim()) return showToast("warning", "請輸入文章標題");
        if (!content.trim()) return showToast("warning", "請輸入文章內容");
        if (!articleClass) return showToast("warning", "請選擇文章分類");

        const data = {
            title: title,
            content: content,
            articleClass: articleClass,
            articleImageUrl: coverImageUrl,
            status: "published" // 發布狀態
        };

        const ajaxUrl = currentArticleId ? `/admin/articles/${currentArticleId}` : "/admin/articles";
        const ajaxMethod = currentArticleId ? "PUT" : "POST";

        $.ajax({
            url: ajaxUrl,
            method: ajaxMethod,
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function (res) {
                if (!currentArticleId && res && res.articleId) {
                    currentArticleId = res.articleId;
                }
                showToast("success", "文章發布成功");
                setTimeout(() => { window.location.href = "/backend/contentmanagement"; }, 1200);
            },
            error: function () {
                showToast("error", "文章發布失敗");
            }
        });
    });
});