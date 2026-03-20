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

            // 迭代會員資料並生成 HTML
            members.forEach(member => {
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
                        </td>
                        <td class="px-6 py-4 text-right">
                            <button class="text-primary hover:text-orange-400 text-sm font-bold">編輯詳情</button>
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