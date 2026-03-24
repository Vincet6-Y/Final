// =============================================
// 初始化
// =============================================
document.addEventListener('DOMContentLoaded', function () {
    // 動態更新上方統計數據（總營收、活躍用戶）— 仍用 AJAX 保持即時
    updateDashboardStats();

    // 初始化圖表
    initRevenueChart();
});

// =============================================
// 儀表板統計數據（AJAX）
// =============================================
function updateDashboardStats() {
    fetch('/api/admin/revenue-stats')
        .then(res => res.json())
        .then(data => {
            const revEl = document.getElementById('display-total-revenue');
            const userEl = document.getElementById('display-active-users');
            if (revEl) revEl.innerText = `$${data.totalRevenue.toLocaleString()}`;
            if (userEl) userEl.innerText = data.activeUsers.toLocaleString();
        })
        .catch(err => console.error("統計資料抓取失敗:", err));
}

// =============================================
// 圖表（AJAX）
// =============================================
let currentChartMode = 'monthly';
let revenueChartInstance = null;

function initRevenueChart(mode = 'monthly') {
    currentChartMode = mode;
    const url = mode === 'monthly' ? '/api/admin/revenue-chart' : '/api/admin/revenue-chart/quarterly';
    const labels = mode === 'monthly'
        ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
        : ['第一季 (Q1)', '第二季 (Q2)', '第三季 (Q3)', '第四季 (Q4)'];

    const btnMonthly = document.getElementById('btn-monthly');
    const btnQuarterly = document.getElementById('btn-quarterly');

    if (mode === 'monthly') {
        btnMonthly.className = "px-4 py-1.5 text-xs font-bold bg-neutral-700 text-white rounded-md transition-colors";
        btnQuarterly.className = "px-4 py-1.5 text-xs font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer";
    } else {
        btnQuarterly.className = "px-4 py-1.5 text-xs font-bold bg-neutral-700 text-white rounded-md transition-colors";
        btnMonthly.className = "px-4 py-1.5 text-xs font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer";
    }

    fetch(url)
        .then(res => res.json())
        .then(data => {
            const ctx = document.getElementById('revenueChart');
            if (!ctx) return;
            if (revenueChartInstance) revenueChartInstance.destroy();

            revenueChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: mode === 'monthly' ? '月營收 (NTD)' : '季營收 (NTD)',
                        data: data,
                        backgroundColor: mode === 'monthly' ? 'rgba(255, 140, 0, 0.8)' : 'rgba(168, 85, 247, 0.8)',
                        hoverBackgroundColor: mode === 'monthly' ? 'rgba(255, 165, 0, 1)' : 'rgba(192, 132, 252, 1)',
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    return '$' + context.parsed.y.toLocaleString();
                                }
                            }
                        }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#9ca3af' } },
                        x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
                    }
                }
            });
        })
        .catch(err => console.error("圖表資料抓取失敗:", err));
}

document.getElementById('btn-monthly').addEventListener('click', () => {
    if (currentChartMode !== 'monthly') initRevenueChart('monthly');
});
document.getElementById('btn-quarterly').addEventListener('click', () => {
    if (currentChartMode !== 'quarterly') initRevenueChart('quarterly');
});

// =============================================
// Modal：查看會員詳情（AJAX 輔助）
// =============================================
window.closeModal = function () {
    document.getElementById('orderModal').classList.add('hidden');
};

window.viewMemberDetails = function (id) {
    const modal = document.getElementById('orderModal');
    const modalContent = document.getElementById('modalContent');
    modal.classList.remove('hidden');
    modalContent.innerHTML = '<div class="flex justify-center py-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>';

    fetch(`/api/admin/members/${id}/details`)
        .then(res => {
            if (!res.ok) throw new Error("取得資料失敗");
            return res.json();
        })
        .then(data => {
            let html = `
                <div class="grid grid-cols-2 gap-4 mb-6 text-slate-100">
                    <div class="bg-neutral-800/80 p-4 rounded-xl border border-neutral-700">
                        <p class="text-xs text-neutral-400 mb-1">用戶名稱</p>
                        <p class="text-lg font-bold">${data.name || '未提供'}</p>
                    </div>
                    <div class="bg-neutral-800/80 p-4 rounded-xl border border-neutral-700">
                        <p class="text-xs text-neutral-400 mb-1">電子郵件</p>
                        <p class="text-lg font-bold truncate" title="${data.email}">${data.email}</p>
                    </div>
                </div>
                <div class="mb-6">
                    <h4 class="text-lg font-bold border-b border-neutral-700 pb-2 mb-3 text-slate-100 flex items-center gap-2">
                        <span class="material-symbols-outlined text-sm">event_note</span> 活動紀錄
                    </h4>
                    <div class="bg-neutral-800/50 p-4 rounded-xl border border-neutral-700">
                        <p class="text-sm text-slate-300">建立的行程數量: <span class="text-primary font-bold text-lg">${data.myPlanCount}</span> 個</p>
                    </div>
                </div>
                <div>
                    <h4 class="text-lg font-bold border-b border-neutral-700 pb-2 mb-3 text-slate-100 flex items-center gap-2">
                        <span class="material-symbols-outlined text-sm">receipt_long</span> 近期訂單
                    </h4>
            `;

            if (data.orders && data.orders.length > 0) {
                html += '<div class="space-y-3">';
                data.orders.forEach(order => {
                    const d = new Date(order.orderTime);
                    const timeStr = isNaN(d) ? order.orderTime : d.toLocaleString();
                    html += `
                        <div class="bg-neutral-800/80 p-4 rounded-xl border border-neutral-700 flex justify-between items-center hover:bg-neutral-700/80 transition-colors">
                            <div class="flex flex-col gap-1">
                                <span class="font-bold text-slate-200">訂單 #${order.orderId}</span>
                                <span class="text-xs text-neutral-400">${timeStr}</span>
                            </div>
                            <div>
                                <span class="text-xs px-3 py-1 rounded-full font-bold ${order.payStatus === '已付款' || order.payStatus === 'PAID' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}">${order.payStatus}</span>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
            } else {
                html += '<div class="text-center py-6 bg-neutral-800/30 rounded-xl border border-neutral-700 border-dashed"><p class="text-sm text-neutral-500">尚無訂單紀錄</p></div>';
            }

            html += '</div>';
            modalContent.innerHTML = html;
        })
        .catch(err => {
            modalContent.innerHTML = '<div class="text-center py-6 bg-red-500/10 rounded-xl border border-red-500/30"><p class="text-red-400 font-bold">無法載入會員詳細資料</p></div>';
            console.error(err);
        });
};

// =============================================
// 操作按鈕：切換權限 / 停權（AJAX + showToast）
// 操作完成後 location.reload() 讓 Thymeleaf 重新渲染表格
// =============================================
window.toggleMemberRole = function (id) {
    fetch(`/api/admin/members/${id}/role`, { method: 'PUT' })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) {
                showToast('error', data.message || '切換權限失敗');
                return;
            }
            showToast('success', data.message || '權限更新成功');
            // 等 toast 顯示後，刷新頁面讓 Thymeleaf 重新渲染
            setTimeout(() => location.reload(), 1200);
        })
        .catch(err => {
            console.error(err);
            showToast('error', '切換權限失敗，請稍後再試');
        });
};

window.toggleMemberStatus = function (id) {
    fetch(`/api/admin/members/${id}/status`, { method: 'PUT' })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) {
                showToast('error', data.message || '切換狀態失敗');
                return;
            }
            showToast('success', data.message || '狀態更新成功');
            setTimeout(() => location.reload(), 1200);
        })
        .catch(err => {
            console.error(err);
            showToast('error', '切換狀態失敗，請稍後再試');
        });
};