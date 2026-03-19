$(document).ready(function () {

    // 【宣告全域變數】放在最頂端，讓底下的「上傳圖」、「發布」、「草稿」都能共用這個變數
    let coverImageUrl = "";

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

        $.ajax({
            url: "/admin/articles/upload",
            method: "POST",
            data: formData,
            processData: false,  // 告訴 jQuery 不要處理資料
            contentType: false,  // 告訴 jQuery 不要設定 Content-Type (讓 FormData 自動設定邊界)
            success: function (res) {
                coverImageUrl = res.url; // 將後端回傳的網址存入全域變數
                $("#coverPreview").attr("src", res.url).removeClass("hidden"); // 顯示預覽圖
                showToast("封面上傳成功");
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
            title: title,
            content: content,
            status: "draft"
        };

        $.ajax({
            url: "/admin/articles",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function () {
                updateSaveTime();
            }
        });
    }, 30000);

    // ==========================================
    // 5. 按鈕邏輯：預覽、存草稿、發布
    // ==========================================
    // 預覽
    $("#previewBtn").click(function () {
        const html = editor.getHTML();
        const previewWindow = window.open("", "_blank");
        previewWindow.document.write(`
            <html>
                <head><title>文章預覽</title><style>body{max-width:800px;margin:auto;padding:40px;font-family:sans-serif;}img{max-width:100%}</style></head>
                <body>${html}</body>
            </html>
        `);
    });

    // 儲存草稿
    $("#draftBtn").click(function () {
        const data = {
            title: $("#titleInput").val(),
            content: editor.getMarkdown(),
            articleClass: $("#articleClass").val(),
            articleImageUrl: coverImageUrl, // 這裡就能正確讀取到上方宣告的變數了
            status: "draft"
        };

        $.ajax({
            url: "/admin/articles",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function () {
                showToast("草稿已儲存");
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
        if (!title.trim()) return showToast("請輸入文章標題");
        if (!content.trim()) return showToast("請輸入文章內容");
        if (!articleClass) return showToast("請選擇文章分類");

        const data = {
            title: title,
            content: content,
            articleClass: articleClass,
            articleImageUrl: coverImageUrl,
            status: "published" // 發布狀態
        };

        $.ajax({
            url: "/admin/articles",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function () {
                showToast("文章發布成功");
                setTimeout(() => { window.location.href = "/admin/articles"; }, 1200);
            },
            error: function () {
                showToast("文章發布失敗");
            }
        });
    });
});