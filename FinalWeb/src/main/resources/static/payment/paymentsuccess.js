// ==========================================
// 🎫 jQuery 驅動的 QR Code & 行程互動邏輯
// ==========================================

$(document).ready(function () {

    // 1. 【關鍵修改】直接從 HTML body 的 data 屬性把 orderId 抓出來
    const orderId = $('body').data('order-id');

    // ==========================================
    // 📦 頁面載入時，從後端撈取所有票券資料
    // ==========================================
    let ticketDataMap = {};
    window.allTickets = []; // 先初始化，避免後面 length 報錯

    if (orderId > 0) {
        $.ajax({
            url: '/api/ticket/byOrder/' + orderId,
            method: 'GET',
            dataType: 'json',
            success: function (tickets) {
                console.log('📦 載入票券資料:', tickets);
                tickets.forEach(function (ticket) {
                    if (ticket.spotId) {
                        ticketDataMap[ticket.spotId] = ticket;
                    }
                    ticketDataMap['detail_' + ticket.orderDetailId] = ticket;
                });
                window.allTickets = tickets;
            },
            error: function (xhr) {
                console.warn('票券資料載入失敗:', xhr.status);
            }
        });
    }

    // ==========================================
    // 📅 Day 分頁切換 
    // ==========================================
    $('.day-tab').on('click', function () {
        const day = $(this).data('day');

        $('.day-tab')
            .removeClass('bg-primary text-white shadow-lg shadow-primary/30')
            .addClass('bg-white dark:bg-[#251d15] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300');
        $(this)
            .removeClass('bg-white dark:bg-[#251d15] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300')
            .addClass('bg-primary text-white shadow-lg shadow-primary/30');

        $('.day-panel').addClass('hidden');
        $('[data-day-panel="' + day + '"]').removeClass('hidden');
    });

    $('#day-scroll-left').on('click', function () {
        $('#day-tabs').animate({ scrollLeft: '-=150' }, 300);
    });
    $('#day-scroll-right').on('click', function () {
        $('#day-tabs').animate({ scrollLeft: '+=150' }, 300);
    });

    // ==========================================
    // 🏛️ 景點 Modal — 點擊景點卡片
    // ==========================================
    $(document).on('click', '.spot-card', function () {
        const $card = $(this);
        const spotName = $card.data('spot-name');
        const placeId = $card.data('place-id');
        const hasTicket = $card.data('has-ticket') === true || $card.data('has-ticket') === 'true';
        const spotId = $card.data('spot-id');
        const day = $card.data('day');
        const visitOrder = $card.data('order');

        $('#modal-name').text(spotName);
        $('#modal-description').text('載入中...');
        $('#modal-detail').text('');
        $('#modal-photo').html('<span class="material-symbols-outlined text-4xl text-slate-300 animate-pulse">photo_camera</span>');

        // 🎫 QR Code 區塊
        if (hasTicket && ticketDataMap[spotId]) {
            const ticket = ticketDataMap[spotId];
            $('#modal-ticket-section').removeClass('hidden');
            $('#modal-qrcode').attr('src', '/api/ticket/qrcode/' + ticket.orderDetailId);

            if (ticket.ticketUsed) {
                $('#modal-ticket-status').text('⚠️ 此票券已使用過').removeClass('text-primary/70').addClass('text-red-400');
            } else {
                $('#modal-ticket-status').text('請在入口處出示此 QR Code 進行掃描驗證。').removeClass('text-red-400').addClass('text-primary/70');
            }
        } else if (hasTicket) {
            $('#modal-ticket-section').removeClass('hidden');
            $('#modal-qrcode').attr('src', 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==');
            $('#modal-ticket-status').text('票券資訊載入中...');

            if (window.allTickets && window.allTickets.length > 0) {
                const matchedTicket = window.allTickets.find(function (t) {
                    return t.ticketType && t.ticketType.includes(spotName);
                }) || window.allTickets[0];

                if (matchedTicket) {
                    $('#modal-qrcode').attr('src', '/api/ticket/qrcode/' + matchedTicket.orderDetailId);
                    $('#modal-ticket-status').text('請在入口處出示此 QR Code 進行掃描驗證。');
                }
            }
        } else {
            $('#modal-ticket-section').addClass('hidden');
        }

        $('#spotModal').removeClass('hidden').addClass('flex');

        // 📸 Google Places API 載入照片
        if (placeId && typeof google !== 'undefined' && google.maps && google.maps.places) {
            if (google.maps.places.Place) {
                const place = new google.maps.places.Place({ id: placeId });

                place.fetchFields({ fields: ['photos', 'editorialSummary', 'formattedAddress'] })
                    .then(() => {
                        if (place.photos && place.photos.length > 0) {
                            const photoUrl = place.photos[0].getURI({ maxWidth: 800, maxHeight: 400 });
                            $('#modal-photo').html('<img src="' + photoUrl + '" class="w-full h-full object-cover" alt="' + spotName + '" />');
                        }

                        const desc = place.editorialSummary ? place.editorialSummary.text : '';
                        $('#modal-description').text(desc || spotName + ' — 值得一遊的景點！');
                        $('#modal-detail').text(place.formattedAddress || '');
                    })
                    .catch((error) => {
                        console.error("載入照片或地點細節失敗：", error);
                        $('#modal-description').text(spotName + ' — 聖地巡禮必訪景點！');
                        $('#modal-detail').text('Day ' + day + ' 第 ' + visitOrder + ' 站');
                    });
            } else {
                console.warn("找不到新版 Place API，請確認你的 script tag 有加上 v=weekly");
                $('#modal-description').text(spotName + ' — 聖地巡禮必訪景點！');
            }
        } else {
            $('#modal-description').text(spotName + ' — 聖地巡禮必訪景點！');
            $('#modal-detail').text('Day ' + day + ' 第 ' + visitOrder + ' 站');
        }
    });

    // ==========================================
    // 🎫 交通票券 Modal — 點擊交通票卡片
    // ==========================================
    $(document).on('click', '.transport-card', function () {
        const $card = $(this);
        const ticketName = $card.data('ticket-name');
        const ticketId = $card.data('ticket-id');

        $('#modal-name').text(ticketName);
        $('#modal-description').text('交通票券 & 附加項目');
        $('#modal-detail').text('請妥善保存您的電子票券。');
        $('#modal-photo').html(
            '<div class="w-full h-full flex flex-col items-center justify-center bg-orange-50 dark:bg-orange-900/10 text-orange-400">' +
            '<span class="material-symbols-outlined text-6xl mb-2">train</span>' +
            '<span class="font-bold text-lg px-6 w-full text-center truncate">' + ticketName + '</span>' +
            '</div>'
        );

        $('#modal-ticket-section').removeClass('hidden');
        $('#modal-qrcode').attr('src', '/api/ticket/qrcode/' + ticketId);

        const ticketKey = 'detail_' + ticketId;
        if (ticketDataMap[ticketKey] && ticketDataMap[ticketKey].ticketUsed) {
            $('#modal-ticket-status').text('⚠️ 此票券已使用過').removeClass('text-primary/70').addClass('text-red-400');
        } else {
            $('#modal-ticket-status').text('請在入口處出示此 QR Code 進行掃描驗證。').removeClass('text-red-400').addClass('text-primary/70');
        }

        $('#spotModal').removeClass('hidden').addClass('flex');
    });

    // ==========================================
    // ❌ 關閉 Modal
    // ==========================================
    $('#closeModalBtn').on('click', function () {
        $('#spotModal').addClass('hidden').removeClass('flex');
    });

    $('#spotModal').on('click', function (e) {
        if (e.target === this) {
            $(this).addClass('hidden').removeClass('flex');
        }
    });

    $(document).on('keydown', function (e) {
        if (e.key === 'Escape') {
            $('#spotModal').addClass('hidden').removeClass('flex');
        }
    });

}); // end $(document).ready