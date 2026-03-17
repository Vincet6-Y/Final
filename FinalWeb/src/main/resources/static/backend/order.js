// 全域變數監控目前狀態
let currentPage = 0;
const pageSize = 10;
let currentStatus = '全部';

// 1. 核心函數：載入訂單 (支援分頁與切片)
async function loadOrders(status = '全部', keyword = '', page = 0) {
    currentPage = page;
    currentStatus = status;
    try {
        let url = `/api/admin/orders/list?status=${encodeURIComponent(status)}&keyword=${encodeURIComponent(keyword)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('API 回傳錯誤');
        const allOrders = await res.json();
        
        // 前端分頁處理：計算切片範圍
        const totalCount = allOrders.length;
        const start = page * pageSize;
        const pagedOrders = allOrders.slice(start, start + pageSize);

        // 更新分頁文字
        const infoElement = document.getElementById('pagination-info');
        if (infoElement) {
            const end = Math.min(start + pageSize, totalCount);
            infoElement.textContent = totalCount > 0 ? 
                `顯示 ${start + 1} 到 ${end} 項，共 ${totalCount} 項訂單` : `查無訂單資料`;
        }

        renderTable(pagedOrders);
        renderPagination(totalCount, page);
    } catch (err) { 
        console.error('列表載入失敗:', err);
    }
}

// 2. 渲染表格
function renderTable(orders) {
    const tbody = document.querySelector('table tbody');
    if(!tbody) return;
    tbody.innerHTML = ''; 
    orders.forEach(order => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-neutral-dark/10 transition-colors';
        const orderDate = order.orderTime ? new Date(order.orderTime).toLocaleString() : '無日期';
        tr.innerHTML = `
            <td class="px-6 py-4 text-sm font-medium">#${order.tradeNo || order.orderId}</td>
            <td class="px-6 py-4 text-sm">
                <div class="font-bold text-slate-100">${order.orderItemsName || '自訂行程'}</div>
                <div class="text-xs text-neutral-muted">${orderDate}</div>
            </td>
            <td class="px-6 py-4 text-sm text-neutral-muted">${orderDate}</td>
            <td class="px-6 py-4 text-sm font-bold">NT$ ${order.totalPrice || 0}</td>
            <td class="px-6 py-4">
                <span class="px-2 py-1 rounded-full text-[10px] font-bold ${getStatusStyle(order.payStatus)}">
                    ${order.payStatus}
                </span>
            </td>
            <td class="px-6 py-4 text-right">
                <button onclick="viewDetail(${order.orderId})" class="text-primary hover:underline text-sm font-medium">查看詳情</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 3. 渲染分頁按鈕
function renderPagination(totalCount, currentPage) {
    const totalPages = Math.ceil(totalCount / pageSize);
    const container = document.getElementById('pagination-container'); // 請確保 HTML 有這個 ID
    if (!container) return;

    let html = `
        <button onclick="changePage(${currentPage - 1})" ${currentPage === 0 ? 'disabled' : ''} 
                class="size-8 rounded border border-neutral-dark flex items-center justify-center hover:bg-neutral-dark disabled:opacity-50">
            <span class="material-symbols-outlined text-sm">chevron_left</span>
        </button>
    `;

    for (let i = 0; i < totalPages; i++) {
        const activeClass = i === currentPage ? 'bg-primary text-background-dark' : 'border border-neutral-dark hover:bg-neutral-dark';
        html += `<button onclick="changePage(${i})" class="size-8 rounded font-bold text-sm ${activeClass}">${i + 1}</button>`;
    }

    html += `
        <button onclick="changePage(${currentPage + 1})" ${currentPage >= totalPages - 1 ? 'disabled' : ''} 
                class="size-8 rounded border border-neutral-dark flex items-center justify-center hover:bg-neutral-dark disabled:opacity-50">
            <span class="material-symbols-outlined text-sm">chevron_right</span>
        </button>
    `;
    container.innerHTML = html;
}

function changePage(newPage) {
    const keyword = document.getElementById('orderSearchInput')?.value || '';
    loadOrders(currentStatus, keyword, newPage);
}

// 4. 載入統計數字
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

// 5. 初始化與事件綁定
document.addEventListener('DOMContentLoaded', function() {
    loadOrders();
    loadStats();
    
    const searchInput = document.getElementById('orderSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                loadOrders('全部', searchInput.value, 0);
            }
        });
    }
});

function getStatusStyle(status) {
    if (status === '已付款') return 'bg-green-500/10 text-green-500 border border-green-500/20';
    if (status === '退款中') return 'bg-red-500/10 text-red-500 border border-red-500/20';
    return 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20';
}

function viewDetail(id) {
    window.location.href = `/admin/order-detail?id=${id}`;
}