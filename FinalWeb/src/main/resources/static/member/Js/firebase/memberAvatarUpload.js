import { storage } from "./firebase.js";
import {
  ref,
  uploadBytes,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

let cropper = null;
let previousTempUrl = "";

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
    let pendingOriginalBlob = null; // 暫存原始圖，等確認裁切後才上傳

    previousTempUrl = $("#originalMemberImgUrl").val();

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

    function compressImage(file, maxSize, quality) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = function () {
                URL.revokeObjectURL(url);
                let width = img.width;
                let height = img.height;
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

    // 開啟檔案選擇
    $uploadBtn.on("click", function () {
        $fileInput.trigger("click");
    });

    // 選完檔案後，開啟裁切 Modal
    $fileInput.on("change", function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/png"];
        if (!allowedTypes.includes(file.type)) {
            alert("只支援 JPG、PNG 格式");
            $fileInput.val("");
            return;
        }

        const reader = new FileReader();
        reader.onload = function (ev) {
            // 把原始檔案暫存起來，等確認裁切後才上傳
            pendingOriginalBlob = file;
            openCropper(ev.target.result);
        };
        reader.readAsDataURL(file);
        $fileInput.val("");
    });

    // 點相機 icon，用 Firebase 的原始圖開啟裁切器
    $("#cropTriggerBtn").on("click", async function () {
        const currentSrc = $preview.attr("src");
        if (!currentSrc || currentSrc === $defaultImg.val()) {
            $fileInput.trigger("click");
            return;
        }

        // 如果有未儲存的原始圖，直接用它開裁切器
        if (pendingOriginalBlob) {
            const reader = new FileReader();
            reader.onload = (e) => openCropper(e.target.result);
            reader.readAsDataURL(pendingOriginalBlob);
            return;
        }

        try {
            // 先 fetch 原始圖轉成 base64，避免 CORS 問題
            const bucket = "anime-travel-website.firebasestorage.app";
            const originalPath = encodeURIComponent(`avatars/${memberId}/original.webp`);
            const originalURL = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${originalPath}?alt=media`;

            const response = await fetch(originalURL);
            const blob = await response.blob();
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(blob);
            });

            openCropper(base64);

        } catch (error) {
            console.error("載入原始圖失敗", error);
            alert("載入原始圖失敗，請重新上傳照片");
        }
    });

    // 取消裁切
    $cancelBtn.on("click", function () {
        $cropModal.css("display", "none");
        if (cropper) { cropper.destroy(); cropper = null; }
        pendingOriginalBlob = null;
    });

    // 確認裁切，裁完後上傳
    $confirmBtn.on("click", async function () {
        if (!cropper) return;

        console.time("總時間");

        console.time("裁切輸出");
        const canvas = cropper.getCroppedCanvas({ width: 256, height: 256 });
        $cropModal.css("display", "none");
        cropper.destroy();
        cropper = null;

        if (!memberId) { alert("找不到會員資料"); return; }

        try {
            $confirmBtn.prop("disabled", true).text("上傳中...");

            // 裁切後輸出圓形 PNG
            const roundCanvas = document.createElement("canvas");
            roundCanvas.width = 400;
            roundCanvas.height = 400;
            const ctx = roundCanvas.getContext("2d");
            ctx.beginPath();
            ctx.arc(200, 200, 200, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(canvas, 0, 0, 400, 400);

            const croppedBlob = await new Promise((resolve, reject) =>
                roundCanvas.toBlob(b => b ? resolve(b) : reject(new Error("轉換失敗")), "image/webp", 0.75)
            );
            console.timeEnd("裁切輸出");

            const bucket = "anime-travel-website.firebasestorage.app";

            const timestamp = Date.now();
            const tempPath = `avatars/${memberId}/profile_${timestamp}.webp`;

            console.time("Firebase上傳");
            if (pendingOriginalBlob) {
                const compressedOriginalBlob = await compressImage(pendingOriginalBlob, 1280, 0.85);
                const originalRef = ref(storage, `avatars/${memberId}/original.webp`);
                const croppedRef = ref(storage, tempPath);
                await Promise.all([
                    uploadBytes(originalRef, compressedOriginalBlob),
                    uploadBytes(croppedRef, croppedBlob)
                ]);
                pendingOriginalBlob = null;
            } else {
                const croppedRef = ref(storage, tempPath);
                await uploadBytes(croppedRef, croppedBlob);
            }
            console.timeEnd("Firebase上傳");

            const encodedPath = encodeURIComponent(tempPath);
            const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;

            console.time("刪除舊檔");
            // 刪掉上一張裁切暫存檔
            if (previousTempUrl && previousTempUrl.includes("profile_")) {
                try {
                    const oldPath = decodeURIComponent(previousTempUrl.split("/o/")[1].split("?")[0]);
                    await deleteObject(ref(storage, oldPath));
                } catch (_) {}
            }

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
        console.timeEnd("總時間");
    });

    // 移除大頭照
    $removeBtn.on("click", async function () {
        // 只清畫面，不動 Firebase
        if (pendingOriginalBlob) {
            pendingOriginalBlob = null;
        }

        // 記錄要刪的暫存裁切圖，等儲存變更時才刪
        isAvatarRemoved = true;
        $memberImgUrl.val("");
        $preview.attr("src", $defaultImg.val());
    });

    // 表單送出時刪除 Firebase 圖片（若有移除操作）
    $profileForm.on("submit", async function (e) {
        if (!isAvatarRemoved) return;
        e.preventDefault();

        try {
            // 刪暫存裁切圖
            if (previousTempUrl && previousTempUrl.includes("profile_")) {
                const oldPath = decodeURIComponent(previousTempUrl.split("/o/")[1].split("?")[0]);
                await deleteObject(ref(storage, oldPath));
            }
            // 刪原始圖
            try {
                await deleteObject(ref(storage, `avatars/${memberId}/original.webp`));
            } catch (_) {}

        } catch (error) {
            if (error.code !== "storage/object-not-found") {
                alert("Firebase 圖片刪除失敗：" + error.message);
                return;
            }
        }

        // Firebase 刪完後才真正送出表單
        this.submit();
    });

});