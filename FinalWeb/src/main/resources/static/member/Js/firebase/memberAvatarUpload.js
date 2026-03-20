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
  const $profileForm = $("#profileForm");

  const memberId = $("body").data("member-id");

  let isAvatarRemoved = false;

  function setPreviewImage(url) {
    $preview.css("background-image", `url("${url}")`);
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
      const avatarRef = ref(storage, `avatars/${memberId}/profile.jpg`);
      await uploadBytes(avatarRef, file);
      const downloadURL = await getDownloadURL(avatarRef);

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