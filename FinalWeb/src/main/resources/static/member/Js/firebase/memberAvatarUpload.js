import { storage } from "./firebase.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

$(function () {
  const $fileInput = $("#avatarFileInput");
  const $uploadBtn = $("#uploadAvatarBtn");
  const $removeBtn = $("#removeAvatarBtn");
  const $preview = $("#memberAvatarPreview");

  const $memberImgUrl = $("#memberImgUrl");
  const $defaultMemberImgUrl = $("#defaultMemberImgUrl");
  const $originalMemberImgUrl = $("#originalMemberImgUrl");

  const memberId = $("body").data("member-id");

  function setPreviewImage(url) {
    $preview.css("background-image", `url("${url}")`);
  }

  function getSafeImageUrl(url) {
    return url && url.trim() ? url : $defaultMemberImgUrl.val();
  }

  // 開啟檔案選擇
  $uploadBtn.on("click", function () {
    $fileInput.trigger("click");
  });

  // 上傳圖片
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
      const avatarRef = ref(storage, `avatars/${memberId}/profile.jpg`);
      await uploadBytes(avatarRef, file);
      const downloadURL = await getDownloadURL(avatarRef);

      // 只更新前端（尚未寫入 DB）
      $memberImgUrl.val(downloadURL);
      setPreviewImage(downloadURL);

    } catch (error) {
      console.error("avatar upload error =", error);
      alert("圖片上傳失敗");
    } finally {
      $fileInput.val("");
    }
  });

  let isAvatarRemoved = false;
  // 移除頭像（只改前端，不刪 Firebase）
  $removeBtn.on("click", function () {
    isAvatarRemoved = true;
    $memberImgUrl.val("");
    setPreviewImage($defaultMemberImgUrl.val());
  });

  // 送出表單時才決定是否刪 Firebase
  $("#profileForm").on("submit", async function () {
      try {
          if (isAvatarRemoved) {
              console.log("刪除 Firebase 圖片");
              const avatarRef = ref(storage, `avatars/${memberId}/profile.jpg`);
              await deleteObject(avatarRef);
          }
      } catch (error) {
          console.error("delete error =", error.code, error.message);
      }
  });

  // 取消 → 還原原始資料（不動 Firebase）
  $("#cancelBtn").on("click", function () {
    const originalUrl = $originalMemberImgUrl.val();

    if (originalUrl) {
      $memberImgUrl.val(originalUrl);
      setPreviewImage(originalUrl);
    } else {
      $memberImgUrl.val("");
      setPreviewImage($defaultMemberImgUrl.val());
    }
  });

});