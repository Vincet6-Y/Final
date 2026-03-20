/**
 * 訂單管理系統 - 完整後台邏輯 (米色背景/移除搜尋版)
 */

// === 全域變數監控目前狀態 ===
let currentPage = 0;
const pageSize = 10;
let currentStatus = '全部';

/**
 * 1. 核心函數：載入訂單 (支援狀態篩選、分頁)
 */
async function loadOrders(status = '全部', page = 0) {
    currentPage = page;
    currentStatus = status;

    try {
        // 移除 keyword，僅保留 status 篩選
        let url = `/api/admin/orders/list?status=${encodeURIComponent(currentStatus)}`;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error('API 回傳錯誤');
        
        const allOrders = await res.json();
        
        // 前端分頁處理
        const totalCount = allOrders.length;
        const start = page * pageSize;
        const pagedOrders = allOrders.slice(start, start + pageSize);

        updatePaginationInfo(start, pagedOrders.length, totalCount);
        renderTable(pagedOrders);
        renderPagination(totalCount, page);
    } catch (err) { 
        console.error('列表載入失敗:', err);
    }
}

/**
 * 2. 渲染表格 (適配米色背景)
 */

function renderTable(orders) {
    const tbody = document.querySelector('table tbody');
    if(!tbody) return;
    
    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-neutral-400">目前尚無相關訂單資料</td></tr>`;
        return;
    }

    tbody.innerHTML = ''; 
    orders.forEach(order => {
        const tr = document.createElement('tr');
        
        // 🌟 修改處：
        // 1. hover:bg-white/10 -> 滑鼠移上去時，背景只會稍微亮一點（10% 透明白）
        // 2. border-neutral-800 -> 保持細線邊框
        tr.className = 'group hover:bg-white/10 transition-all duration-300 border-b border-neutral-800 flex flex-col md:table-row cursor-pointer';
        
        const orderDate = order.orderTime ? new Date(order.orderTime).toLocaleDateString() : '無日期';
        const displayId = order.tradeNo ? order.tradeNo : `${order.orderId}`;
        const price = order.totalPrice ? order.totalPrice.toLocaleString() : '0';

        tr.innerHTML = `
            <td class="px-6 py-4 text-sm font-mono text-slate-100 group-hover:text-primary transition-colors">
                <span class="md:hidden font-bold text-neutral-500"># </span>${displayId}
            </td>

            <td class="px-6 py-1 md:py-4 text-sm">
                <div class="font-bold text-white group-hover:translate-x-1 transition-transform inline-block">
                    ${order.orderItemsName || '自訂行程'}
                </div>
            </td>

            <td class="hidden md:table-cell px-6 py-4 text-sm text-slate-100">
                ${orderDate}
            </td>

            <td class="px-6 py-2 md:py-4 flex justify-between items-center md:table-cell">
                <span class="md:hidden text-xs text-neutral-500 font-bold uppercase">總額</span>
                <span class="text-sm font-bold text-white">NT$ ${price}</span>
            </td>

            <td class="px-6 py-2 md:py-4 flex justify-between items-center md:table-cell">
                <span class="md:hidden text-xs text-neutral-500 font-bold uppercase">狀態</span>
                <span class="px-2 py-1 rounded-full text-[10px] font-bold ${getStatusStyle(order.payStatus)}">
                    ${order.payStatus}
                </span>
            </td>

            <td class="px-6 py-4 text-right md:table-cell">
                <button onclick="viewDetail(${order.orderId})" 
                        class="text-primary hover:text-primary-light text-sm font-bold flex items-center justify-end gap-1 ml-auto">
                    查看詳情
                    <span class="material-symbols-outlined text-xs">arrow_forward_ios</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
    
       
  

/**
 * 3. 詳情彈窗邏輯 (米白色背景專用渲染)
 */
async function viewDetail(id) {
    const modal = document.getElementById('orderModal');
    const content = document.getElementById('modalContent');
    
    modal.classList.remove('hidden');
    content.innerHTML = `<div class="flex justify-center py-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>`;

    try {
        const res = await fetch(`/api/admin/orders/detail/${id}`);
        if (!res.ok) throw new Error('無法取得訂單資料');
        const order = await res.json();

        // A. 購買人資訊 HTML (針對米白背景優化顏色)
        let customerHtml = `
            <div class="bg-[#FFFBF5] p-6 rounded-2xl border border-neutral-200 mb-8 shadow-inner">
                <p class="text-[10px] text-neutral-400 uppercase font-bold tracking-widest mb-3">購買人資訊</p>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-slate-800 font-bold">${order.customerName || '未知顧客'}</p>
                        <p class="text-xs text-neutral-500">顧客姓名</p>
                    </div>
                    <div>
                        <p class="text-sm text-slate-800 font-medium">${order.customerEmail || '未提供 Email'}</p>
                        <p class="text-xs text-neutral-500">電子郵件</p>
                    </div>
                </div>
            </div>
        `;

        // B. 處理行程清單 HTML
        let detailHtml = '';
        if (order.orderDetails && order.orderDetails.length > 0) {
            detailHtml = order.orderDetails.map(item => `
                <div class="flex justify-between items-center p-4 bg-white rounded-xl border border-neutral-200 shadow-sm">
                    <div class="flex items-center gap-3">
                        <div class="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span class="material-symbols-outlined text-primary text-lg">confirmation_number</span>
                        </div>
                        <span class="text-slate-700 font-bold">${item.ticketType}</span>
                    </div>
                    <span class="text-sm text-slate-900 font-mono font-bold">NT$ ${item.ticketPrice.toLocaleString()}</span>
                </div>
            `).join('');
        } else {
            detailHtml = `<p class="text-sm text-neutral-400 italic text-center py-4 bg-neutral-50 rounded-lg">查無明細內容</p>`;
        }

        // C. 渲染完整內容 (全面使用深色文字 text-slate-XXX)
        content.innerHTML = `
            ${customerHtml} 

            <div class="space-y-4">
                <p class="text-[11px] text-neutral-500 uppercase font-bold tracking-widest px-1">已購行程清單</p>
                <div class="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    ${detailHtml}
                </div>
            </div>

            <div class="pt-8 border-t border-neutral-200 flex justify-between items-end mt-8">
                <div>
                    <div class="mb-2">
                        <span class="text-[10px] text-neutral-400 uppercase font-bold tracking-wider block mb-1">付款狀態</span>
                        <span class="px-3 py-1 rounded-full text-[10px] font-bold ${getStatusStyle(order.payStatus)}">
                            ${order.payStatus}
                        </span>
                    </div>
                    <p class="text-3xl font-black text-slate-900">
                        <span class="text-sm font-medium mr-1 text-slate-500">NT$</span>${order.totalPrice ? order.totalPrice.toLocaleString() : 0}
                    </p>
                </div>
                
                <div class="text-right">
                    <p class="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">訂單建立時間</p>
                    <p class="text-slate-600 font-mono text-sm">
                        ${order.orderTime ? new Date(order.orderTime).toLocaleString() : '---'}
                    </p>
                </div>
            </div>
        `;
    } catch (err) {
        content.innerHTML = `<div class="text-red-500 text-center py-10 font-bold">資料串接失敗，請檢查 API</div>`;
    }
}

/**
 * 4. 分頁渲染
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
                class="size-8 rounded border border-neutral-300 flex items-center justify-center hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-600">
            <span class="material-symbols-outlined text-sm">chevron_left</span>
        </button>
    `;

    for (let i = 0; i < totalPages; i++) {
        const activeClass = i === currentPage 
            ? 'bg-primary text-white' 
            : 'border border-neutral-300 hover:bg-neutral-100 text-slate-600';
        html += `<button onclick="changePage(${i})" class="size-8 rounded font-bold text-sm transition-colors ${activeClass}">${i + 1}</button>`;
    }

    html += `
        <button onclick="changePage(${currentPage + 1})" ${currentPage >= totalPages - 1 ? 'disabled' : ''} 
                class="size-8 rounded border border-neutral-300 flex items-center justify-center hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-600">
            <span class="material-symbols-outlined text-sm">chevron_right</span>
        </button>
    `;
    container.innerHTML = html;
}

function changePage(newPage) {
    loadOrders(currentStatus, newPage);
}

function updatePaginationInfo(start, currentCount, totalCount) {
    const infoElement = document.getElementById('pagination-info');
    if (!infoElement) return;
    infoElement.textContent = totalCount === 0 ? `共 0 項訂單` : `顯示 ${start + 1} 到 ${start + currentCount} 項，共 ${totalCount} 項訂單`;
}

/**
 * 5. 其他初始化邏輯
 */
async function loadStats() {
    try {
        const res = await fetch('/api/admin/orders/stats');
        const data = await res.json();
        if(document.getElementById('stat-pending')) document.getElementById('stat-pending').textContent = data.pendingOrders || 0;
        if(document.getElementById('stat-refund')) document.getElementById('stat-refund').textContent = data.refundRequests || 0;
        if(document.getElementById('stat-today')) document.getElementById('stat-today').textContent = data.todayIssued || 0;
    } catch (err) {
        console.error('統計載入失敗:', err);
    }
}

function closeModal() {
    const modal = document.getElementById('orderModal');
    if (modal) modal.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', function() {
    loadOrders();
    loadStats();
    
    // 點擊彈窗外部關閉
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('orderModal');
        if (e.target === modal) closeModal();
    });
});

/**
 * 工具函數：狀態樣式 (適配淺色背景)
 */
function getStatusStyle(status) {
    switch (status) {
        case '已付款': return 'bg-green-100 text-green-700 border border-green-200';
        case '退款中': return 'bg-red-100 text-red-700 border border-red-200';
        case '待處理': return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
        default: return 'bg-neutral-100 text-neutral-500 border border-neutral-200';
    }
}