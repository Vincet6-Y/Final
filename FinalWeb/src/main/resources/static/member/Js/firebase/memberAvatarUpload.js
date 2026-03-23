import { storage } from "./firebase.js";
import {ref, uploadBytes, deleteObject} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

// Firebase Storage bucket 名稱
const BUCKET = "anime-travel-website.firebasestorage.app";
let cropper = null;
let previousTempUrl = "";

// ==================== Firebase 路徑 / URL 工具 ====================
/** 取得指定路徑的 Firebase Storage 下載 URL */
function getDownloadURL(path) {
    return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media`;
}

/** 從 Firebase 下載 URL 反解出 Storage 路徑 */
function getPathFromURL(url) {
    return decodeURIComponent(url.split("/o/")[1].split("?")[0]);
}

// ==================== 圖片處理工具 ====================

/** 將 Blob 轉成 base64 data URL */
function blobToBase64(blob) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(blob);
    });
}

/** 壓縮圖片到指定最大尺寸，輸出 webp Blob */
function compressImage(file, maxSize, quality) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = function () {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height = Math.round(height * maxSize / width);
                    width = maxSize;
                } else {
                    width = Math.round(width * maxSize / height);
                    height = maxSize;
                }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            canvas.getContext("2d").drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => blob ? resolve(blob) : reject(new Error("壓縮失敗")),
                "image/webp",
                quality
            );
        };
        img.onerror = reject;
        img.src = url;
    });
}

/** 將裁切後的 canvas 輸出成圓形 webp Blob（400x400） */
function canvasToRoundBlob(canvas) {
    const roundCanvas = document.createElement("canvas");
    roundCanvas.width = 400;
    roundCanvas.height = 400;
    const ctx = roundCanvas.getContext("2d");
    ctx.beginPath();
    ctx.arc(200, 200, 200, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(canvas, 0, 0, 400, 400);
    return new Promise((resolve, reject) =>
        roundCanvas.toBlob(
            (b) => b ? resolve(b) : reject(new Error("轉換失敗")),
            "image/webp",
            0.75
        )
    );
}

// ==================== 主邏輯 ====================
$(function () {
    const $fileInput   = $("#avatarFileInput");
    const $uploadBtn   = $("#uploadAvatarBtn");
    const $removeBtn   = $("#removeAvatarBtn");
    const $preview     = $("#memberAvatarPreview");
    const $memberImgUrl = $("#memberImgUrl");
    const $defaultImg  = $("#defaultMemberImgUrl");
    const $profileForm = $("#profileForm");
    const $cropModal   = $("#cropModal");
    const $cropperImg  = $("#cropperImage");
    const $confirmBtn  = $("#cropConfirmBtn");
    const $cancelBtn   = $("#cropCancelBtn");

    const memberId = $("body").data("member-id");
    let isAvatarRemoved = false;
    let pendingOriginalBlob = null;

    previousTempUrl = $("#originalMemberImgUrl").val();

    // ==================== 裁切器 ====================
    /** 開啟裁切 Modal，並初始化 Cropper */
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
    //  上傳裁切後的圖片到 Firebase
    //  若有新的原始圖（pendingOriginalBlob），同步上傳壓縮後的原始圖
    //  回傳裁切圖的下載 URL
    async function uploadCroppedBlob(croppedBlob) {
        const tempPath = `avatars/${memberId}/profile_${Date.now()}.webp`;

        if (pendingOriginalBlob) {
            const compressedOriginal = await compressImage(pendingOriginalBlob, 1280, 0.85);
            await Promise.all([
                uploadBytes(ref(storage, `avatars/${memberId}/original.webp`), compressedOriginal),
                uploadBytes(ref(storage, tempPath), croppedBlob)
            ]);
            pendingOriginalBlob = null;
        } else {
            await uploadBytes(ref(storage, tempPath), croppedBlob);
        }
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
    // 點擊上傳按鈕，觸發檔案選擇
    $uploadBtn.on("click", function () {
        $fileInput.trigger("click");
    });

    // 選完檔案後，暫存原始檔並開啟裁切器
    $fileInput.on("change", function (e) {
        const file = e.target.files[0];
        if (!file) return;
        if (!["image/jpeg", "image/png"].includes(file.type)) {
            alert("只支援 JPG、PNG 格式");
            $fileInput.val("");
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            pendingOriginalBlob = file;
            openCropper(ev.target.result);
        };
        reader.readAsDataURL(file);
        $fileInput.val("");
    });

    // 點相機 icon：有現有圖片則重新裁切，否則開啟檔案選擇
    $("#cropTriggerBtn").on("click", async function () {
        const currentSrc = $preview.attr("src");
        if (!currentSrc || currentSrc === $defaultImg.val()) {
            $fileInput.trigger("click");
            return;
        }
        // 若有未儲存的原始圖，直接用它重新裁切
        if (pendingOriginalBlob) {
            openCropper(await blobToBase64(pendingOriginalBlob));
            return;
        }
        // 否則從 Firebase 取回原始圖
        try {
            const originalURL = getDownloadURL(`avatars/${memberId}/original.webp`);
            const blob = await fetch(originalURL).then(r => r.blob());
            openCropper(await blobToBase64(blob));
        } catch (error) {
            console.error("載入原始圖失敗", error);
            alert("載入原始圖失敗，請重新上傳照片");
        }
    });

    // 取消裁切，關閉 Modal 並清除暫存
    $cancelBtn.on("click", function () {
        $cropModal.css("display", "none");
        if (cropper) { cropper.destroy(); cropper = null; }
        pendingOriginalBlob = null;
    });

    // 確認裁切，輸出圓形圖後上傳到 Firebase
    $confirmBtn.on("click", async function () {
        if (!cropper) return;
        if (!memberId) { alert("找不到會員資料"); return; }

        const canvas = cropper.getCroppedCanvas({ width: 256, height: 256 });
        $cropModal.css("display", "none");
        cropper.destroy();
        cropper = null;

        try {
            $confirmBtn.prop("disabled", true).text("上傳中...");
            const croppedBlob = await canvasToRoundBlob(canvas);
            const downloadURL = await uploadCroppedBlob(croppedBlob);

            await deletePreviousTempFile();

            previousTempUrl = downloadURL;
            isAvatarRemoved = false;
            $memberImgUrl.val(downloadURL);
            $preview.attr("src", downloadURL);

        } catch (error) {
            console.error("upload error =", error);
            alert("圖片上傳失敗");
        } finally {
            $confirmBtn.prop("disabled", false).text("確認裁切");
        }
    });

    // 移除大頭照：只清畫面狀態，不動 Firebase（等表單送出才刪）
    $removeBtn.on("click", function () {
        pendingOriginalBlob = null;
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
            // 刪除原始圖（不存在時忽略）
            try {
                await deleteObject(ref(storage, `avatars/${memberId}/original.webp`));
            } catch (_) {}
        } catch (error) {
            if (error.code !== "storage/object-not-found") {
                alert("Firebase 圖片刪除失敗：" + error.message);
                return;
            }
        }

        this.submit();
    });

});