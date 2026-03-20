// firebase 圖片上傳
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

    let coverImageUrl = "";
    let currentArticleId = null;

    // ==========================================
    // 1. 初始化 Toast UI Editor（純 WYSIWYG，隱藏 Markdown 切換）
    // ==========================================
    const editor = new toastui.Editor({
        el: document.querySelector('#editor'),
        height: '500px',
        initialEditType: 'wysiwyg',
        hideModeSwitch: true,           // ✅ 隱藏 Markdown/WYSIWYG 切換按鈕
        previewStyle: 'vertical',
        theme: 'dark',
        placeholder: "開始撰寫你的巡禮故事..."
    });

    // ==========================================
    // 2. 共用：顯示封面預覽
    // ==========================================
    function showCoverPreview(url) {
        if (url) {
            $("#coverPreview").attr("src", url).removeClass("hidden");
        } else {
            $("#coverPreview").addClass("hidden").attr("src", "");
        }
    }

    // ==========================================
    // 3. 封面圖片 URL 輸入框 — 手動貼網址即時預覽
    // ==========================================
    $("#coverUrlInput").on("input", function () {
        const url = $(this).val().trim();
        coverImageUrl = url;
        showCoverPreview(url);
    });

    // ==========================================
    // 4. 封面上傳 → Firebase Storage
    // ==========================================
    $("#coverUpload").on("click", function (e) {
        if ($(e.target).is("#coverInput")) return;
        $("#coverInput").trigger("click");
    });

    $(document).on("change", "#coverInput", async function () {
        const file = this.files[0];
        if (!file) return;

        if (typeof window.firebaseUploadCover !== "function") {
            showToast("error", "Firebase 尚未就緒，請稍後再試");
            return;
        }

        const articleClass = $("#articleClass").val() || "未分類";

        $("#coverUpload").html(`
            <span class="material-symbols-outlined text-4xl text-slate-400">sync</span>
            <p class="text-sm text-slate-400">上傳中...</p>
            <input type="file" id="coverInput" accept="image/*" hidden>
        `);

        try {
            const downloadURL = await window.firebaseUploadCover(file, articleClass);
            coverImageUrl = downloadURL;

            $("#coverUrlInput").val(downloadURL);
            showCoverPreview(downloadURL);

            $("#coverUpload").html(`
                <span class="material-symbols-outlined text-4xl text-green-400">check_circle</span>
                <p class="text-sm text-green-400">封面已上傳</p>
                <p class="text-xs text-slate-500">點擊重新選擇</p>
                <input type="file" id="coverInput" accept="image/*" hidden>
            `);
            showToast("success", "封面上傳成功");

        } catch (err) {
            console.error("Firebase 上傳失敗：", err);
            $("#coverUpload").html(`
                <span class="material-symbols-outlined text-4xl text-red-400">error</span>
                <p class="text-sm text-red-400">上傳失敗，點擊重試</p>
                <input type="file" id="coverInput" accept="image/*" hidden>
            `);
            showToast("error", "封面上傳失敗：" + err.message);
        }
    });

    // ==========================================
    // 5. 編輯模式：URL 帶 ?editId=xxx 就載入舊資料
    // ==========================================
    const editId = new URLSearchParams(window.location.search).get("editId");

    if (editId) {
        currentArticleId = parseInt(editId);
        $.ajax({
            url: `/admin/articles/${editId}`,
            method: "GET",
            success: function (article) {
                $("#titleInput").val(article.title);
                $("#articleClass").val(article.articleClass);

                // ✅ 統一用 setHTML，不再區分 markdown
                const content = article.content || "";
                editor.setHTML(content);

                if (article.articleImageUrl) {
                    coverImageUrl = article.articleImageUrl;
                    $("#coverUrlInput").val(article.articleImageUrl);
                    showCoverPreview(article.articleImageUrl);
                }

                $("h2").text("編輯文章：" + article.title);
                showToast("success", "文章資料已載入");
            },
            error: function () {
                showToast("error", "無法載入文章");
            }
        });
    }

    // ==========================================
    // 6. 取得編輯器 HTML 內容（永遠回傳 HTML）
    // ==========================================
    function getContent() {
        return editor.getHTML();
    }

    // ==========================================
    // 7. 更新最後儲存時間
    // ==========================================
    function updateSaveTime() {
        const now = new Date();
        const time = String(now.getHours()).padStart(2, "0") + ":" +
            String(now.getMinutes()).padStart(2, "0");
        $("#saveTime").text("最後儲存：" + time);
    }

    // ==========================================
    // 8. 共用存文章函式
    // ==========================================
    function saveArticle(status, onSuccess) {
        const data = {
            title: $("#titleInput").val() || "未命名草稿",
            content: getContent(),
            articleClass: $("#articleClass").val(),
            articleImageUrl: coverImageUrl,
            status: status
        };

        const url = currentArticleId ? `/admin/articles/${currentArticleId}` : "/admin/articles";
        const method = currentArticleId ? "PUT" : "POST";

        $.ajax({
            url: url, method: method,
            contentType: "application/json",
            data: JSON.stringify(data),
            success: function (res) {
                if (!currentArticleId && res && res.articleId) {
                    currentArticleId = res.articleId;
                }
                updateSaveTime();
                if (onSuccess) onSuccess(res);
            },
            error: function () {
                showToast("error", "儲存失敗");
            }
        });
    }

    // ==========================================
    // 9. 每 30 秒自動儲存草稿
    // ==========================================
    setInterval(function () {
        if (!$("#titleInput").val() && !getContent()) return;
        saveArticle("draft");
    }, 30000);

    // ==========================================
    // 10. 手動存草稿
    // ==========================================
    $("#draftBtn").on("click", function () {
        saveArticle("draft", function () {
            showToast("success", "草稿已儲存");
        });
    });

    // ==========================================
    // 11. 預覽
    // ==========================================
    $("#previewBtn").on("click", function () {
        const previewData = {
            title: $("#titleInput").val() || "未命名文章",
            articleClass: $("#articleClass").val() || "未分類",
            content: getContent() || "沒有內容...",
            articleImageUrl: coverImageUrl || "",
            editId: currentArticleId || null,
            isAdminPreview: true
        };
        sessionStorage.setItem("articlePreview", JSON.stringify(previewData));
        window.open("/admin/articles/preview", "_blank");
    });

    // ==========================================
    // 12. 發布文章
    // ==========================================
    $("#publishBtn").on("click", function () {
        const title = $("#titleInput").val();
        const content = getContent();
        const articleClass = $("#articleClass").val();

        if (!title.trim()) return showToast("warning", "請輸入文章標題");
        if (!content.trim()) return showToast("warning", "請輸入文章內容");
        if (!articleClass) return showToast("warning", "請選擇文章分類");

        saveArticle("published", function () {
            showToast("success", "文章發布成功");
            setTimeout(function () {
                window.location.href = "/backend/contentmanagement";
            }, 1200);
        });
    });

});