//firebase 圖片上傳
import { storage } from "/member/Js/firebase/firebase.js";
import { ref, uploadBytes, getDownloadURL }
    from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

window.firebaseUploadCover = async function (file, articleClass) {
    const storagePath = `articles/${articleClass}/${Date.now()}_cover`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
};

$(document).ready(function () {
    // 【宣告全域變數】放在最頂端，讓底下的「上傳圖」、「發布」、「草稿」都能共用這個變數
    let coverImageUrl = "";
    let currentArticleId = null;
    // ==========================================
    // 1. 初始化 UI Editor
    // ==========================================
    const editor = new toastui.Editor({
        el: document.querySelector('#editor'),
        height: '500px',
        initialEditType: 'markdown',
        previewStyle: 'vertical',
        theme: 'dark',
        placeholder: "開始撰寫你的巡禮故事..."
    });

    // ==========================================
    // 2. ✅ 編輯模式：若 URL 帶有 ?editId=xxx 就載入舊資料
    // ==========================================
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get("editId");

    if (editId) {
        currentArticleId = parseInt(editId);
        $.ajax({
            url: `/admin/articles/${editId}`,
            method: "GET",
            success: function (article) {
                $("#titleInput").val(article.title);
                $("#articleClass").val(article.articleClass);
                editor.setMarkdown(article.content || "");

                if (article.articleImageUrl) {
                    coverImageUrl = article.articleImageUrl;
                    $("#coverPreview").attr("src", article.articleImageUrl).removeClass("hidden");
                }

                // 更新頁面標題提示
                $("h2").text("編輯文章：" + article.title);
                showToast("success", "文章資料已載入");
            },
            error: function () {
                showToast("error", "無法載入文章，請確認 ID 是否正確");
            }
        });
    }

    // ==========================================
    // 3. 封面圖上傳邏輯
    // ==========================================
    $("#coverUpload").click(function (e) {
        if (e.target.id !== 'coverInput') {
            $("#coverInput").click();
        }
    });

    $("#coverInput").change(function () {
        const file = this.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);
        const currentClass = $("#articleClass").val() || "未分類";
        formData.append("articleClass", currentClass);

        $.ajax({
            url: "/admin/articles/upload",
            method: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function (res) {
                coverImageUrl = res.url;
                $("#coverPreview").attr("src", res.url).removeClass("hidden");
                showToast("success", "封面上傳成功");
            },
            error: function () {
                showToast("error", "封面上傳失敗");
            }
        });
    });

    // ==========================================
    // 4. 更新最後儲存時間
    // ==========================================
    function updateSaveTime() {
        const now = new Date();
        const time = now.getHours().toString().padStart(2, "0") + ":" +
            now.getMinutes().toString().padStart(2, "0");
        $("#saveTime").text("最後儲存：" + time);
    }

    // ==========================================
    // 5. 每 30 秒自動儲存草稿
    // ==========================================
    setInterval(function () {
        const title = $("#titleInput").val();
        const content = editor.getMarkdown();
        if (!title && !content) return;

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
    // 6. 預覽按鈕
    // ==========================================
    $("#previewBtn").click(function () {
        const previewData = {
            title: $("#titleInput").val() || "未命名文章",
            articleClass: $("#articleClass").val() || "未分類",
            content: editor.getMarkdown() || "沒有內容..."
        };
        sessionStorage.setItem('articlePreview', JSON.stringify(previewData));
        window.open("/admin/articles/preview", "_blank");
    });

    // ==========================================
    // 7. 儲存草稿
    // ==========================================
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
            },
            error: function () {
                showToast("error", "草稿儲存失敗");
            }
        });
    });

    // ==========================================
    // 8. 發布文章
    // ==========================================
    $("#publishBtn").click(function () {
        const title = $("#titleInput").val();
        const content = editor.getMarkdown();
        const articleClass = $("#articleClass").val();

        if (!title.trim()) return showToast("warning", "請輸入文章標題");
        if (!content.trim()) return showToast("warning", "請輸入文章內容");
        if (!articleClass) return showToast("warning", "請選擇文章分類");

        const data = {
            title: title,
            content: content,
            articleClass: articleClass,
            articleImageUrl: coverImageUrl,
            status: "published"
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
