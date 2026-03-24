// 定義全域變數紀錄目前頁碼
let currentPage = 0;
const pageSize = 3; // 設定每頁顯示 3 筆，方便測試翻頁

document.addEventListener('DOMContentLoaded', function() {
    // 1. 初始化載入：更新上方統計數據（總營收、活躍用戶）
    updateDashboardStats();

    // 2. 初始化載入：更新會員表格（第一頁）
    fetchMembers(currentPage);

    // 3. 綁定分頁按鈕事件
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 0) {
                currentPage--;
                fetchMembers(currentPage);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentPage++;
            fetchMembers(currentPage);
        });
    }
});

/**
 * 抓取並更新儀表板統計數據
 */
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

/**
 * 抓取特定頁數的會員資料並渲染表格
 * @param {number} page - 頁碼 (從 0 開始)
 */
function fetchMembers(page) {
    fetch(`/api/admin/members?page=${page}&size=${pageSize}`)
        .then(res => {
            if (!res.ok) throw new Error("網路請求失敗");
            return res.json();
        })
        .then(data => {
            // Spring Data Page 物件的資料在 content 屬性中
            const members = data.content;
            const tableBody = document.getElementById('member-table-body');
            if (!tableBody) return;

            // 清空目前的表格內容
            tableBody.innerHTML = '';

            // 如果沒有會員資料
            if (members.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-neutral-500">目前沒有會員資料</td></tr>';
                return;
            }

            // 取得當前登入管理員的 ID
            const currentAdminId = document.getElementById('currentAdminId')?.value;

            // 迭代會員資料並生成 HTML
            members.forEach(member => {
                const isSelf = currentAdminId && String(member.memberId) === String(currentAdminId);
                const row = `
                    <tr class="hover:bg-neutral-700/30 transition-colors">
                        <td class="px-6 py-4 text-sm text-neutral-400 font-mono">UID-${member.memberId}</td>
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <div class="size-8 rounded-full bg-neutral-700 overflow-hidden" 
                                     style="background-image: url('${member.memberImgUrl || 'https://ui-avatars.com/api/?name=' + (member.name || 'User')}'); background-size: cover; background-position: center;">
                                </div>
                                <span class="text-sm font-medium text-slate-100">${member.name || '未填寫姓名'}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-sm text-neutral-400">${member.email}</td>
                        <td class="px-6 py-4 text-center">
                            <span class="px-2 py-1 text-[10px] font-bold ${member.role === 'ROLE_ADMIN' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'} rounded uppercase tracking-wider">
                                ${member.role === 'ROLE_ADMIN' ? '管理員' : '一般會員'}
                            </span>
                            ${member.deleted ? '<span class="ml-1 px-2 py-1 text-[10px] font-bold bg-red-500/20 text-red-400 rounded uppercase">已停權</span>' : ''}
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex flex-row items-center justify-end gap-3">
                                <button onclick="viewMemberDetails(${member.memberId})" class="text-blue-400 hover:text-blue-300 text-xs font-bold flex items-center gap-1 transition-colors whitespace-nowrap">
                                    👁️ 查看詳情
                                </button>
                                ${isSelf ? '' : `<button onclick="toggleMemberRole(${member.memberId})" class="text-purple-400 hover:text-purple-300 text-xs font-bold flex items-center gap-1 transition-colors whitespace-nowrap">
                                    🛡️ 權限設定
                                </button>`}
                                ${isSelf ? '' : `<button onclick="toggleMemberStatus(${member.memberId})" class="${member.deleted ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'} text-xs font-bold flex items-center gap-1 transition-colors whitespace-nowrap">
                                    ${member.deleted ? '✅ 啟用帳號' : '🚫 停權此帳號'}
                                </button>`}
                            </div>
                        </td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });

            // 更新下方的分頁文字資訊 (例如: 顯示 1 到 3 之 6 位用戶)
            updatePaginationUI(data);
        })
        .catch(err => {
            console.error("會員清單抓取失敗:", err);
        });
}

/**
 * 更新分頁文字與按鈕狀態
 * @param {Object} data - Spring Page 物件
 */
function updatePaginationUI(data) {
    const infoEl = document.getElementById('pagination-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (infoEl) {
        // 計算當前顯示的範圍
        const start = data.number * data.size + 1;
        const end = start + data.numberOfElements - 1;
        infoEl.innerText = `顯示 ${start} 到 ${end} 之 ${data.totalElements} 位用戶`;
    }

    // 根據是否為第一頁或最後一頁，停用/啟用按鈕
    if (prevBtn) prevBtn.disabled = data.first;
    if (nextBtn) nextBtn.disabled = data.last;
}

document.addEventListener('DOMContentLoaded', function() {
    // 加上當前年份顯示
    const yearSpan = document.getElementById('current-year');
    if(yearSpan) yearSpan.innerText = new Date().getFullYear();

    updateDashboardStats();
    fetchMembers(currentPage);
    
    // ★ 新增這行：初始化圖表
    initRevenueChart(); 
    
    // ... 原本的分頁按鈕事件綁定 ...
});

/**
 * 抓取每月營收並繪製 Chart.js 圖表
 */
let currentChartMode = 'monthly'; // 預設月報
let revenueChartInstance = null;

function initRevenueChart(mode = 'monthly') {
    currentChartMode = mode;
    const url = mode === 'monthly' ? '/api/admin/revenue-chart' : '/api/admin/revenue-chart/quarterly';
    const labels = mode === 'monthly' 
        ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
        : ['第一季 (Q1)', '第二季 (Q2)', '第三季 (Q3)', '第四季 (Q4)'];

    // ★ 視覺優化：動態切換按鈕的顏色樣式
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

            // 如果已經有圖表，先銷毀才能畫新的
            if (revenueChartInstance) {
                revenueChartInstance.destroy();
            }

            revenueChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: mode === 'monthly' ? '月營收 (NTD)' : '季營收 (NTD)',
                        data: data,
                        // ★ 視覺優化：月報用橘色，季報用紫色，讓畫面更豐富
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
                                label: function(context) {
                                    return '$' + context.parsed.y.toLocaleString();
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { color: '#9ca3af' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#9ca3af' }
                        }
                    }
                }
            });
        })
        .catch(err => console.error("圖表資料抓取失敗:", err));
}

// 綁定按鈕點擊事件
document.getElementById('btn-monthly').addEventListener('click', () => {
    if (currentChartMode !== 'monthly') initRevenueChart('monthly');
});
document.getElementById('btn-quarterly').addEventListener('click', () => {
    if (currentChartMode !== 'quarterly') initRevenueChart('quarterly');
});

// 定義全域 Modal 操控與按鈕功能
window.closeModal = function() {
    document.getElementById('orderModal').classList.add('hidden');
};

window.viewMemberDetails = function(id) {
    const modal = document.getElementById('orderModal');
    const modalContent = document.getElementById('modalContent');
    modal.classList.remove('hidden');
    
    // 顯示載入動畫
    modalContent.innerHTML = '<div class="flex justify-center py-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>';
    
    fetch(`/api/admin/members/${id}/details`)
        .then(res => {
            if(!res.ok) throw new Error("取得資料失敗");
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
            modalContent.innerHTML = '<div class="text-center py-6 bg-red-500/10 rounded-xl border border-red-500/30"><p class="text-red-400 font-bold">無法載入會員詳細資料，或伺服器發生錯誤</p></div>';
            console.error(err);
        });
};

window.toggleMemberRole = function(id) {
    fetch(`/api/admin/members/${id}/role`, { method: 'PUT' })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) {
                showToast('error', data.message || '切換權限失敗');
                return;
            }
            showToast('success', data.message || '權限更新成功');
            fetchMembers(currentPage);
        })
        .catch(err => {
            console.error(err);
            showToast('error', '切換權限失敗，請稍後再試');
        });
};

window.toggleMemberStatus = function(id) {
    fetch(`/api/admin/members/${id}/status`, { method: 'PUT' })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) {
                showToast('error', data.message || '切換狀態失敗');
                return;
            }
            showToast('success', data.message || '狀態更新成功');
            fetchMembers(currentPage);
        })
        .catch(err => {
            console.error(err);
            showToast('error', '切換狀態失敗，請稍後再試');
        });
};