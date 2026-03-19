import { storage } from "./firebase.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

$(function () {
  const $fileInput = $("#avatarFileInput");
  const $uploadBtn = $("#uploadAvatarBtn");
  const $preview = $("#memberAvatarPreview");
  const memberId = $("body").data("member-id");

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

      if ($preview.length) {
        $preview.css("background-image", `url("${downloadURL}")`);
      }

      $.ajax({
        url: "/member/profile/avatar",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({ avatarUrl: downloadURL }),
        success: function () {
          location.reload();
        },
        error: function () {
          alert("圖片網址儲存失敗");
        }
      });

    } catch (error) {
      console.error("avatar upload error =", error);
      alert("圖片上傳失敗");
    } finally {
      $fileInput.val("");
    }
  });
});