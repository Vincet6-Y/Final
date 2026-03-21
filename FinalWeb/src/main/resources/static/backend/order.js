/**
 * 訂單管理系統 - 完整後台邏輯 (米色背景/僅保留詳情視窗，列表由 Thymeleaf 渲染)
 */

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

function closeModal() {
    const modal = document.getElementById('orderModal');
    if (modal) modal.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', function() {
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