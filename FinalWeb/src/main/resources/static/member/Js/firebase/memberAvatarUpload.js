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

        try {
            // 先 fetch 原始圖轉成 base64，避免 CORS 問題
            const bucket = "anime-travel-website.firebasestorage.app";
            const originalPath = encodeURIComponent(`avatars/${memberId}/original.jpg`);
            const originalURL = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${originalPath}?alt=media`;

            const response = await fetch(originalURL);
            const blob = await response.blob();
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(blob);
            });

            pendingOriginalBlob = null;
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

        const canvas = cropper.getCroppedCanvas({ width: 400, height: 400 });
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
                roundCanvas.toBlob(b => b ? resolve(b) : reject(new Error("轉換失敗")), "image/png", 0.9)
            );

            const bucket = "anime-travel-website.firebasestorage.app";

            // 如果是新上傳的照片，同時存原始圖
            if (pendingOriginalBlob) {
                const originalRef = ref(storage, `avatars/${memberId}/original.jpg`);
                await uploadBytes(originalRef, pendingOriginalBlob);
                pendingOriginalBlob = null;
            }

            // 存裁切後的圖（帶時間戳避免 cache）
            const timestamp = Date.now();
            const tempPath  = `avatars/${memberId}/profile_${timestamp}.png`;
            const croppedRef = ref(storage, tempPath);
            await uploadBytes(croppedRef, croppedBlob);

            const encodedPath = encodeURIComponent(tempPath);
            const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;

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
    });

    // 移除大頭照
    $removeBtn.on("click", function () {
        isAvatarRemoved = true;
        $memberImgUrl.val("");
        $preview.attr("src", $defaultImg.val());
    });

    // 表單送出時刪除 Firebase 圖片（若有移除操作）
    $profileForm.on("submit", async function (e) {
        if (!isAvatarRemoved) return;
        try {
            // 刪裁切圖和原始圖
            await deleteObject(ref(storage, `avatars/${memberId}/original.jpg`));
            await deleteObject(ref(storage, `avatars/${memberId}/profile.jpg`));
        } catch (error) {
            if (error.code !== "storage/object-not-found") {
                e.preventDefault();
                alert("Firebase 圖片刪除失敗：" + error.message);
            }
        }
    });

});