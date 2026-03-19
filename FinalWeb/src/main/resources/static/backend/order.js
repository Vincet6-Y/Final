// === 全域變數監控目前狀態 ===
let currentPage = 0;
const pageSize = 10;
let currentStatus = '全部';
let currentKeyword = ''; // 新增：紀錄目前的搜尋關鍵字，避免換頁時遺失

/**
 * 1. 核心函數：載入訂單 (支援狀態篩選、關鍵字搜尋、分頁)
 */
async function loadOrders(status = '全部', keyword = '', page = 0) {
    currentPage = page;
    currentStatus = status;
    currentKeyword = keyword.trim(); // 儲存並去除空白

    try {
        // 構建 API URL
        let url = `/api/admin/orders/list?status=${encodeURIComponent(currentStatus)}&keyword=${encodeURIComponent(currentKeyword)}`;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error('API 回傳錯誤');
        
        const allOrders = await res.json();
        
        // 前端分頁處理：計算切片範圍
        const totalCount = allOrders.length;
        const start = page * pageSize;
        const pagedOrders = allOrders.slice(start, start + pageSize);

        // 更新 UI 上的分頁文字資訊
        updatePaginationInfo(start, pagedOrders.length, totalCount);

        renderTable(pagedOrders);
        renderPagination(totalCount, page);
    } catch (err) { 
        console.error('列表載入失敗:', err);
    }
}

/**
 * 2. 渲染表格
 */
function renderTable(orders) {
    const tbody = document.querySelector('table tbody');
    if(!tbody) return;
    
    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-neutral-muted">查無相關訂單資料</td></tr>`;
        return;
    }

    tbody.innerHTML = ''; 
    orders.forEach(order => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-neutral-dark/10 transition-colors border-b border-neutral-dark/50';
        
        // 格式化日期與金額
        const orderDate = order.orderTime ? new Date(order.orderTime).toLocaleString() : '無日期';
        const displayId = order.tradeNo ? order.tradeNo : ` ${order.orderId}`;
        const price = order.totalPrice ? order.totalPrice.toLocaleString() : '0';

        tr.innerHTML = `
            <td class="px-6 py-4 text-sm font-medium">${displayId}</td>
            <td class="px-6 py-4 text-sm">
                <div class="font-bold text-slate-100">${order.orderItemsName || '自訂行程'}</div>
                <div class="text-xs text-neutral-muted">建立時間: ${orderDate}</div>
            </td>
            <td class="px-6 py-4 text-sm text-neutral-muted">${orderDate}</td>
            <td class="px-6 py-4 text-sm font-bold text-primary">NT$ ${price}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-full text-[10px] font-bold ${getStatusStyle(order.payStatus)}">
                    ${order.payStatus}
                </span>
            </td>
            <td class="px-6 py-4 text-right">
                <button onclick="viewDetail(${order.orderId})" class="text-primary hover:text-primary-light hover:underline text-sm font-medium transition-colors">查看詳情</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * 3. 渲染分頁按鈕邏輯
 */
function renderPagination(totalCount, currentPage) {
    const totalPages = Math.ceil(totalCount / pageSize);
    const container = document.getElementById('pagination-container');
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `
        <button onclick="changePage(${currentPage - 1})" ${currentPage === 0 ? 'disabled' : ''} 
                class="size-8 rounded border border-neutral-dark flex items-center justify-center hover:bg-neutral-dark disabled:opacity-30 disabled:cursor-not-allowed">
            <span class="material-symbols-outlined text-sm">chevron_left</span>
        </button>
    `;

    for (let i = 0; i < totalPages; i++) {
        const activeClass = i === currentPage ? 'bg-primary text-background-dark' : 'border border-neutral-dark hover:bg-neutral-dark text-slate-300';
        html += `<button onclick="changePage(${i})" class="size-8 rounded font-bold text-sm transition-colors ${activeClass}">${i + 1}</button>`;
    }

    html += `
        <button onclick="changePage(${currentPage + 1})" ${currentPage >= totalPages - 1 ? 'disabled' : ''} 
                class="size-8 rounded border border-neutral-dark flex items-center justify-center hover:bg-neutral-dark disabled:opacity-30 disabled:cursor-not-allowed">
            <span class="material-symbols-outlined text-sm">chevron_right</span>
        </button>
    `;
    container.innerHTML = html;
}

// 換頁動作 (保持目前的狀態與關鍵字)
function changePage(newPage) {
    loadOrders(currentStatus, currentKeyword, newPage);
}

// 更新分頁資訊文字
function updatePaginationInfo(start, currentCount, totalCount) {
    const infoElement = document.getElementById('pagination-info');
    if (!infoElement) return;

    if (totalCount === 0) {
        infoElement.textContent = `共 0 項訂單`;
    } else {
        const end = start + currentCount;
        infoElement.textContent = `顯示 ${start + 1} 到 ${end} 項，共 ${totalCount} 項訂單`;
    }
}

/**
 * 4. 載入統計數字
 */
async function loadStats() {
    try {
        const res = await fetch('/api/admin/orders/stats');
        const data = await res.json();
        document.getElementById('stat-pending').textContent = data.pendingOrders || 0;
        document.getElementById('stat-refund').textContent = data.refundRequests || 0;
        document.getElementById('stat-today').textContent = data.todayIssued || 0;
    } catch (err) {
        console.error('統計載入失敗:', err);
    }
}

/**
 * 5. 初始化與事件綁定
 */
document.addEventListener('DOMContentLoaded', function() {
    // 初始載入
    loadOrders();
    loadStats();
    
    // 搜尋輸入框事件綁定
    const searchInput = document.getElementById('orderSearchInput');
    if (searchInput) {
        // 按下 Enter 搜尋
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                loadOrders('全部', searchInput.value, 0);
            }
        });

        // 監聽輸入：若使用者清空搜尋文字，自動重新載入全部列表
        searchInput.addEventListener('input', (e) => {
            if (e.target.value.trim() === '') {
                loadOrders('全部', '', 0);
            }
        });
    }

    // 搜尋圖示點擊事件 (選配：讓放大鏡圖示也可以點擊)
    const searchIcon = document.querySelector('.material-symbols-outlined.absolute.left-3');
    if (searchIcon) {
        searchIcon.style.cursor = 'pointer';
        searchIcon.addEventListener('click', () => {
            loadOrders('全部', searchInput.value, 0);
        });
    }
});

/**
 * 小工具函數
 */
function getStatusStyle(status) {
    switch (status) {
        case '已付款':
            return 'bg-green-500/10 text-green-500 border border-green-500/20';
        case '退款中':
            return 'bg-red-500/10 text-red-500 border border-red-500/20';
        case '待處理':
            return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
        default:
            return 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20';
    }
}

function viewDetail(id) {
    // 跳轉到詳情頁面
    window.location.href = `/admin/order-detail?id=${id}`;
}