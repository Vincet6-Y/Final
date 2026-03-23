// 大頭照載入處理：圖片載入失敗時顯示預設圖，載入完成時隱藏 skeleton
(function () {
    const avatar = document.getElementById("memberAvatar");
    const skeleton = document.getElementById("avatarSkeleton");
    if (!avatar) return;

    avatar.onload = function () {
        this.style.opacity = "1";
        skeleton.style.display = "none";
    };

    avatar.onerror = function () {
        this.src = this.dataset.defaultImg;
        this.style.opacity = "1";
        skeleton.style.display = "none";
    };

    if (avatar.complete) {
        avatar.style.opacity = "1";
        skeleton.style.display = "none";
    }
})();