let currentPage = 0;
const pageSize = 3; 

document.addEventListener('DOMContentLoaded', function() {
    // 1. 更新上方統計數據
    updateDashboardStats();

    // 2. 更新會員表格
    fetchMembers(currentPage);

    // 3. 初始化長條圖 (設定 10萬一格，共5格)
    initRevenueChart();

    // 4. 分頁按鈕事件
    setupPagination();
});

    async function initRevenueChart() {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;

    try {
        // 1. 從後端取得真實營收數據
        const response = await fetch('/api/admin/monthly-revenue');
        const monthlyMap = await response.json();

        // 2. 將 Map 轉換為 Chart.js 需要的陣列格式 [1月, 2月, ..., 12月]
        const revenueData = [];
        for (let i = 1; i <= 12; i++) {
            revenueData.push(monthlyMap[i] || 0);
        }

        const ctx = canvas.getContext('2d');
        
        // 銷毀舊圖表防止重疊
        if (window.myRevenueChart) {
            window.myRevenueChart.destroy();
        }

        window.myRevenueChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
                datasets: [{
                    label: '每月營收',
                    data: revenueData, // 💡 這裡是真實資料
                    backgroundColor: '#f97316',
                    borderRadius: 5,
                    barThickness: 40
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        min: 0,
                        max: 500000, // 💡 最大 50 萬
                        ticks: {
                            stepSize: 100000, // 💡 10 萬一格
                            color: '#94a3b8',
                            callback: function(value) {
                                return '$' + (value / 1000) + 'k';
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    } catch (error) {
        console.error("圖表資料讀取失敗:", error);
    }
}

         

// --- 統計數據與分頁邏輯保持不變 ---

function updateDashboardStats() {
    fetch('/api/admin/revenue-stats')
        .then(res => res.json())
        .then(data => {
            const revEl = document.getElementById('display-total-revenue');
            const userEl = document.getElementById('display-active-users');
            if (revEl) revEl.innerText = `$${data.totalRevenue.toLocaleString()}`;
            if (userEl) userEl.innerText = data.activeUsers.toLocaleString();
        })
        .catch(err => console.error("數據抓取失敗:", err));
}

function fetchMembers(page) {
    fetch(`/api/admin/members?page=${page}&size=${pageSize}`)
        .then(res => res.json())
        .then(data => {
            const tableBody = document.getElementById('member-table-body');
            if (!tableBody) return;
            tableBody.innerHTML = '';
            data.content.forEach(member => {
                const row = `
                    <tr class="hover:bg-neutral-700/30 transition-colors">
                        <td class="px-6 py-4 text-sm text-neutral-400 font-mono">UID-${member.memberId}</td>
                        <td class="px-6 py-4 text-slate-100">${member.name || '未填寫'}</td>
                        <td class="px-6 py-4 text-sm text-neutral-400">${member.email}</td>
                        <td class="px-6 py-4 text-center">
                            <span class="px-2 py-1 text-[10px] font-bold bg-blue-500/20 text-blue-400 rounded uppercase">
                                ${member.role === 'ROLE_ADMIN' ? '管理員' : '一般會員'}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <button class="text-primary font-bold">編輯</button>
                        </td>
                    </tr>`;
                tableBody.innerHTML += row;
            });
            updatePaginationUI(data);
        });
}

function updatePaginationUI(data) {
    const infoEl = document.getElementById('pagination-info');
    if (infoEl) {
        const start = data.number * data.size + 1;
        const end = start + data.numberOfElements - 1;
        infoEl.innerText = `顯示 ${start} 到 ${end} 之 ${data.totalElements} 位用戶`;
    }
    document.getElementById('prev-page').disabled = data.first;
    document.getElementById('next-page').disabled = data.last;
}

function setupPagination() {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    if (prevBtn) prevBtn.onclick = () => { if (currentPage > 0) { currentPage--; fetchMembers(currentPage); } };
    if (nextBtn) nextBtn.onclick = () => { currentPage++; fetchMembers(currentPage); };
}