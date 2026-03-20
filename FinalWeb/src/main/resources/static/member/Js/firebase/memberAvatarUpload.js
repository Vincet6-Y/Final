import { storage } from "./firebase.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

function compressImage(file, maxSize, quality) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = function () {
            URL.revokeObjectURL(url);

            // 計算縮放比例，超過 maxSize 才縮
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
                "image/jpeg",
                quality  // 0~1，0.85 = 品質85%
            );
        };

        img.onerror = reject;
        img.src = url;
    });
}

$(function () {
  const $fileInput = $("#avatarFileInput");
  const $uploadBtn = $("#uploadAvatarBtn");
  const $removeBtn = $("#removeAvatarBtn");
  const $preview = $("#memberAvatarPreview");

  const $memberImgUrl = $("#memberImgUrl");
  const $defaultMemberImgUrl = $("#defaultMemberImgUrl");
  const $profileForm = $("#profileForm");

  const memberId = $("body").data("member-id");

  let isAvatarRemoved = false;

  function setPreviewImage(url) {
      $preview.attr("src", url);
  }

  function getSafeImageUrl(url) {
    return url && url.trim() ? url : $defaultMemberImgUrl.val();
  }

  $uploadBtn.on("click", function () {
    $fileInput.trigger("click");
  });

  $fileInput.on("change", async function (e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!memberId) {
      alert("找不到會員資料");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      alert("只支援 JPG、PNG 格式");
      $fileInput.val("");
      return;
    }

    try {

      // 壓縮圖片再上傳
      const compressedBlob = await compressImage(file, 400, 0.85);

      const avatarRef = ref(storage, `avatars/${memberId}/profile.jpg`);
      await uploadBytes(avatarRef, compressedBlob);
      const bucket = "anime-travel-website.firebasestorage.app";
      const path = encodeURIComponent(`avatars/${memberId}/profile.jpg`);
      const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${path}?alt=media`;

      isAvatarRemoved = false;
      $memberImgUrl.val(downloadURL);
      setPreviewImage(downloadURL);

    } catch (error) {
      console.error("avatar upload error =", error.code, error.message, error);
      alert("圖片上傳失敗");
    } finally {
      $fileInput.val("");
    }
  });

  $removeBtn.on("click", function () {
    isAvatarRemoved = true;
    $memberImgUrl.val("");
    setPreviewImage($defaultMemberImgUrl.val());
  });

  $profileForm.on("submit", async function (e) {
    if (!isAvatarRemoved) {
      return;
    }

    try {
      console.log("準備刪除 Firebase 圖片:", `avatars/${memberId}/profile.jpg`);
      const avatarRef = ref(storage, `avatars/${memberId}/profile.jpg`);
      await deleteObject(avatarRef);
      console.log("Firebase 圖片刪除成功");
    } catch (error) {
      console.error("delete error =", error.code, error.message, error);

      if (error.code !== "storage/object-not-found") {
        e.preventDefault();
        alert("Firebase 圖片刪除失敗：" + error.message);
      }
    }
  });

});