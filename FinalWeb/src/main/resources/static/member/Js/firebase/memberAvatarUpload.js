import { storage } from "./firebase.js";
import { ref, uploadBytes, deleteObject } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

const BUCKET = "anime-travel-website.firebasestorage.app";
let cropper = null;

// ==================== Firebase 路徑 / URL 工具 ====================
function getDownloadURL(path) {
    return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media`;
}

function getPathFromURL(url) {
    return decodeURIComponent(url.split("/o/")[1].split("?")[0]);
}

// ==================== 圖片處理工具 ====================

/** 將裁切後的 canvas 輸出成圓形 jpeg Blob（400x400） */
function canvasToRoundBlob(canvas) {
    const roundCanvas = document.createElement("canvas");
    roundCanvas.width = 400;
    roundCanvas.height = 400;
    const ctx = roundCanvas.getContext("2d");

    // jpeg 不支援透明背景，先填白色底
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 400, 400);

    ctx.beginPath();
    ctx.arc(200, 200, 200, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(canvas, 0, 0, 400, 400);

    return new Promise((resolve, reject) =>
        roundCanvas.toBlob(
            (b) => b ? resolve(b) : reject(new Error("轉換失敗")),
            "image/jpeg",
            0.8  // 品質 0~1，0.8 為畫質與檔案大小的平衡點
        )
    );
}

// ==================== 主邏輯 ====================
$(function () {
    const $fileInput    = $("#avatarFileInput");
    const $uploadBtn    = $("#uploadAvatarBtn");
    const $removeBtn    = $("#removeAvatarBtn");
    const $preview      = $("#memberAvatarPreview");
    const $memberImgUrl = $("#memberImgUrl");
    const $defaultImg   = $("#defaultMemberImgUrl");
    const $profileForm  = $("#profileForm");
    const $cropModal    = $("#cropModal");
    const $cropperImg   = $("#cropperImage");
    const $confirmBtn   = $("#cropConfirmBtn");
    const $cancelBtn    = $("#cropCancelBtn");

    const memberId = $("body").data("member-id");
    let isAvatarRemoved = false;
    let previousTempUrl = $("#originalMemberImgUrl").val();

    // ==================== 裁切器 ====================
    function openCropper(src) {
        $cropperImg.attr("src", src);
        $cropModal.css("display", "flex");
        if (cropper) cropper.destroy();
        cropper = new Cropper($cropperImg[0], {
            aspectRatio: 1,
            viewMode: 1,
            dragMode: "move",
            cropBoxResizable: false,
            cropBoxMovable: false,
            autoCropArea: 1,
            guides: false,
            highlight: false,
            background: false,
            ready() {
                document.querySelector(".cropper-view-box").style.borderRadius = "50%";
                document.querySelector(".cropper-face").style.borderRadius = "50%";
            }
        });
    }

    // ==================== 上傳流程 ====================
    /** 上傳裁切後的圖片到 Firebase，回傳下載 URL */
    async function uploadCroppedBlob(croppedBlob) {
        const tempPath = `avatars/${memberId}/profile_${Date.now()}.jpg`;
        await uploadBytes(ref(storage, tempPath), croppedBlob);
        return getDownloadURL(tempPath);
    }

    /** 刪除上一張裁切暫存檔（檔名含 profile_ 才處理，避免誤刪） */
    async function deletePreviousTempFile() {
        if (previousTempUrl && previousTempUrl.includes("profile_")) {
            try {
                await deleteObject(ref(storage, getPathFromURL(previousTempUrl)));
            } catch (_) {}
        }
    }

    // ==================== 事件綁定 ====================

    // 點擊上傳按鈕或相機 icon，觸發檔案選擇
    $uploadBtn.on("click", function () {
        $fileInput.trigger("click");
    });

    $("#cropTriggerBtn").on("click", function () {
        $fileInput.trigger("click");
    });

    // 選完檔案後，開啟裁切器
    $fileInput.on("change", function (e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!["image/jpeg", "image/png"].includes(file.type)) {
            showToast("error", "只支援 JPG、PNG 格式");
            $fileInput.val("");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast("error", "圖片大小不能超過 5MB");
            $fileInput.val("");
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => openCropper(ev.target.result);
        reader.readAsDataURL(file);
        $fileInput.val("");
    });

    // 取消裁切
    $cancelBtn.on("click", function () {
        $cropModal.css("display", "none");
        if (cropper) { cropper.destroy(); cropper = null; }
    });

    // 確認裁切，上傳到 Firebase
    $confirmBtn.on("click", async function () {
        if (!cropper) return;
        if (!memberId) { alert("找不到會員資料"); return; }

        const canvas = cropper.getCroppedCanvas({ width: 256, height: 256 });
        $cropModal.css("display", "none");
        cropper.destroy();
        cropper = null;

        try {
            $confirmBtn.prop("disabled", true).text("上傳中...");
            showToast("info", "圖片上傳中，請稍候...");

            const croppedBlob = await canvasToRoundBlob(canvas);
            const downloadURL = await uploadCroppedBlob(croppedBlob);

            // 刪除舊的裁切圖
            await deletePreviousTempFile();

            previousTempUrl = downloadURL;
            isAvatarRemoved = false;
            $memberImgUrl.val(downloadURL);
            $preview.attr("src", downloadURL);

            $preview.off("load.avatar").on("load.avatar", function () {
                showToast("success", "大頭照上傳成功！");
                $preview.off("load.avatar");
            });

        } catch (error) {
            console.error("upload error =", error);
            showToast("error", "圖片上傳失敗，請稍後再試");
        } finally {
            $confirmBtn.prop("disabled", false).text("確認裁切");
        }
    });

    // 移除大頭照
    $removeBtn.on("click", function () {
        isAvatarRemoved = true;
        $memberImgUrl.val("");
        $preview.attr("src", $defaultImg.val());
    });

    // 表單送出：若有移除操作，先刪 Firebase 的圖片再送出
    $profileForm.on("submit", async function (e) {
        if (!isAvatarRemoved) return;
        e.preventDefault();

        try {
            await deletePreviousTempFile();
            await deleteOriginalFile();
        } catch (error) {
            if (error.code !== "storage/object-not-found") {
                alert("Firebase 圖片刪除失敗：" + error.message);
                return;
            }
        }

        this.submit();
    });

});