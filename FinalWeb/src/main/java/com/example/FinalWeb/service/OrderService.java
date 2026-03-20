package com.example.FinalWeb.service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.entity.MyMapEntity;
import com.example.FinalWeb.entity.MyPlanEntity;
import com.example.FinalWeb.entity.OrdersDetailEntity;
import com.example.FinalWeb.entity.OrdersEntity;
import com.example.FinalWeb.repo.OrdersRepo;
import com.example.FinalWeb.repo.MemberRepo;
import com.example.FinalWeb.repo.OrdersDetailRepo;
import com.example.FinalWeb.dto.TicketDto;

@Service
public class OrderService {

    @Autowired
    private OrdersRepo ordersRepo;

    @Autowired
    private OrdersDetailRepo ordersDetailRepo;

    @Autowired
    private TicketService ticketService;

    @Transactional
    public OrdersEntity createOrder(MemberEntity member, MyPlanEntity myPlan, List<OrdersDetailEntity> ticketCart) {
        OrdersEntity newOrder = new OrdersEntity();
        newOrder.setMember(member);
        newOrder.setMyPlan(myPlan);
        newOrder.setPayStatus("未付款");
        newOrder.setOrderTime(LocalDateTime.now());

        if (ticketCart != null && !ticketCart.isEmpty()) {
            for (OrdersDetailEntity ticket : ticketCart) {
                ticket.setOrders(newOrder);
            }
        }
        newOrder.setOrderDetails(ticketCart);
        return ordersRepo.save(newOrder);
    }

    public OrdersEntity getOrderById(Integer orderId) {
        return ordersRepo.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("找不到該筆訂單 ID: " + orderId));
    }

    // 🌟 給會員首頁用的，負責把這個會員的訂單撈出來並排序
    public List<OrdersEntity> getMemberOrders(Integer memberId) {
        return ordersRepo.findByMember_MemberIdOrderByOrderTimeDesc(memberId);
    }

    public int calculateTotalAmount(OrdersEntity order) {
        if (order == null || order.getOrderDetails() == null) {
            return 0;
        }
        return order.getOrderDetails().stream()
                .mapToInt(detail -> detail.getTicketPrice() != null ? detail.getTicketPrice() : 0)
                .sum();
    }

    /**
     * 🌟 處理前端傳來的加購門票與交通票 (支援購物車多選！)
     */
    @Transactional
    public void processAddonTickets(OrdersEntity order, List<String> ticketNames, List<Integer> ticketPrices,
            List<String> transportIds) {

        // --- 1. 處理多張景點門票 ---
        if (ticketNames != null && ticketPrices != null && ticketNames.size() == ticketPrices.size()) {
            for (int i = 0; i < ticketNames.size(); i++) {
                String tName = ticketNames.get(i);
                Integer tPrice = ticketPrices.get(i);
                if (tName != null && !tName.isEmpty() && tPrice != null && tPrice > 0) {
                    OrdersDetailEntity detail = createNewTicketDetail(order, tName, tPrice);
                    ordersDetailRepo.save(detail);
                }
            }
        }

        // --- 2. 安全地處理「多張」交通票 ---
        if (transportIds != null && !transportIds.isEmpty()) {
            for (String tId : transportIds) {
                TicketDto tInfo = ticketService.getTicketById(tId);
                if (tInfo != null) {
                    OrdersDetailEntity transportDetail = createNewTicketDetail(order, tInfo.getTicketName(),
                            tInfo.getPrice());
                    ordersDetailRepo.save(transportDetail);
                }
            }
        }
    }

    /**
     * 刪除使用者在結帳頁面取消的「舊票券」
     */
    @Transactional
    public void removeOrderDetails(List<Integer> detailIds) {
        if (detailIds != null && !detailIds.isEmpty()) {
            ordersDetailRepo.deleteAllById(detailIds);
        }
    }

    // 私有小工具：幫忙建立票券實體，減少重複程式碼
    private OrdersDetailEntity createNewTicketDetail(OrdersEntity order, String name, Integer price) {
        OrdersDetailEntity detail = new OrdersDetailEntity();
        detail.setTicketType(name);
        detail.setTicketPrice(price);
        detail.setOrders(order);
        detail.setQrToken(UUID.randomUUID().toString());
        detail.setTicketUsed(false);
        return detail;
    }

    public Map<Integer, List<MyMapEntity>> groupMapsByDay(List<MyMapEntity> allMaps) {
        if (allMaps == null || allMaps.isEmpty()) {
            return new TreeMap<>();
        }
        return allMaps.stream()
                .sorted(Comparator.comparingInt((MyMapEntity m) -> m.getDayNumber() != null ? m.getDayNumber() : 0)
                        .thenComparingInt(m -> m.getVisitOrder() != null ? m.getVisitOrder() : 0))
                .collect(Collectors.groupingBy(
                        m -> m.getDayNumber() != null ? m.getDayNumber() : 1,
                        TreeMap::new,
                        Collectors.toList()));
    }

    public Map<String, Object> classifyTickets(OrdersEntity order) {
        Set<Integer> ticketSpotIds = new HashSet<>();
        List<OrdersDetailEntity> transportTickets = new ArrayList<>();

        if (order.getOrderDetails() != null) {
            for (OrdersDetailEntity detail : order.getOrderDetails()) {
                boolean isSpotTicket = false;

                if (detail.getMyMap() != null && detail.getMyMap().getSpotId() != null) {
                    ticketSpotIds.add(detail.getMyMap().getSpotId());
                    isSpotTicket = true;
                } else if (detail.getTicketType() != null && order.getMyPlan() != null
                        && order.getMyPlan().getMyMaps() != null) {
                    for (MyMapEntity m : order.getMyPlan().getMyMaps()) {
                        TicketDto tInfo = ticketService.getTicketByPlaceId(m.getGooglePlaceId());
                        if (tInfo != null && detail.getTicketType().equals(tInfo.getTicketName())) {
                            ticketSpotIds.add(m.getSpotId());
                            isSpotTicket = true;
                            break;
                        }
                    }
                }

                // 如果找不到對應景點，它就會乖乖被分類到交通票的清單裡
                if (!isSpotTicket) {
                    transportTickets.add(detail);
                }
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("ticketSpotIds", ticketSpotIds);
        result.put("transportTickets", transportTickets);
        return result;
    }

    // 🌟 3. 給管理後台：獲取儀表板統計數據
    public Map<String, Object> getAdminDashboardStats() {
        Map<String, Object> stats = new HashMap<>();

        // 1. 待處理訂單：通常指「已付款」但「尚未完成服務/核銷」或「待處理」狀態的訂單
        long pendingCount = ordersRepo.countByPayStatus("待處理");

        // 2. 退款請求：計算狀態為「退款中」的數量
        long refundCount = ordersRepo.countByPayStatus("退款中");

        // 3. 今日發放憑證：統計今日「已付款」的訂單總數
        // 這裡建議在 Repo 新增一個查詢今日成功的計算，或者先用 findAll 篩選
        long todayIssued = ordersRepo.findAll().stream()
                .filter(o -> "已付款".equals(o.getPayStatus()) &&
                        o.getOrderTime().toLocalDate().equals(java.time.LocalDate.now()))
                .count();

        stats.put("pendingOrders", pendingCount);
        stats.put("refundRequests", refundCount);
        stats.put("todayIssued", todayIssued);

        // 漲跌幅暫時回傳固定值或不回傳，等資料庫資料變多再寫計算邏輯
        return stats;
    }

    // 🌟 4. 給管理後台：獲取所有訂單列表 (包含篩選功能)
    // 修改 OrderService.java 中的 getAllOrdersForAdmin 方法
    public List<OrdersEntity> getAllOrdersForAdmin(String status, String keyword) {
        if (keyword != null && !keyword.trim().isEmpty()) {
            // 🌟 改用剛才寫的多欄位搜尋方法
            return ordersRepo.searchOrders(keyword.trim());
        }

        if (status != null && !status.equals("全部")) {
            return ordersRepo.findByPayStatusOrderByOrderTimeDesc(status);
        }

        return ordersRepo.findAll(org.springframework.data.domain.Sort
                .by(org.springframework.data.domain.Sort.Direction.DESC, "orderTime"));
    }

    // 🌟 5. 給管理後台：更新訂單狀態 (退款、出貨等操作)
    @Transactional
    public void updateOrderStatus(Integer orderId, String newStatus) {
        OrdersEntity order = getOrderById(orderId);
        order.setPayStatus(newStatus);
        ordersRepo.save(order);
    }

    // 🌟 新增：計算所有訂單的總營收
    public long getTotalRevenue() {
        // 1. 取得所有訂單
        List<OrdersEntity> allOrders = ordersRepo.findAll();

        // 2. 篩選已付款訂單並加總金額
        return allOrders.stream()
                .filter(o -> "已付款".equals(o.getPayStatus()))
                .mapToLong(o -> (long) calculateTotalAmount(o))
                .sum();
    }

    @Autowired
    private MemberRepo memberRepo; // 記得注入 MemberRepo

    public long getTotalCount() {
        return memberRepo.count(); // 回傳資料庫會員總數
    }

    // 🌟 新增：取得今年 1~12 月的營收陣列 (給圖表用)
    public List<Integer> getMonthlyRevenueForCurrentYear() {
        // 建立一個長度為 12 的陣列，預設全部為 0
        List<Integer> monthlyRevenue = new ArrayList<>(Collections.nCopies(12, 0));

        // 找出所有已付款的訂單
        List<OrdersEntity> paidOrders = ordersRepo.findByPayStatusOrderByOrderTimeDesc("已付款");

        int currentYear = java.time.LocalDate.now().getYear();

        for (OrdersEntity order : paidOrders) {
            // 綠界付款成功後應該會有 payTime，如果沒有，退而求其次用 orderTime
            LocalDateTime timeToCheck = order.getPayTime() != null ? order.getPayTime() : order.getOrderTime();

            if (timeToCheck != null && timeToCheck.getYear() == currentYear) {
                // 取得該訂單是第幾個月 (1~12)
                int monthIndex = timeToCheck.getMonthValue() - 1; // 陣列索引是 0~11

                // 呼叫你原本寫好的 calculateTotalAmount 來算這筆訂單的錢
                int orderTotal = calculateTotalAmount(order);
                monthlyRevenue.set(monthIndex, monthlyRevenue.get(monthIndex) + orderTotal);
            }
        }
        return monthlyRevenue;
    }

    public List<Integer> getQuarterlyRevenueForCurrentYear() {
        List<Integer> monthly = getMonthlyRevenueForCurrentYear(); // 取得 12 個月的資料
        List<Integer> quarterly = new ArrayList<>();

        for (int i = 0; i < 12; i += 3) {
            // 每三個月加總一次
            int quarterSum = monthly.get(i) + monthly.get(i + 1) + monthly.get(i + 2);
            quarterly.add(quarterSum);
        }
        return quarterly; // 回傳 [Q1, Q2, Q3, Q4]
    }
    // 請確認這段程式碼位於 OrderService 類別內
public Map<String, Object> getOrderDetailWithItems(Integer orderId) {
    OrdersEntity order = ordersRepo.findById(orderId).orElse(null);
    if (order == null) return null;

    Map<String, Object> detail = new HashMap<>();
    detail.put("orderId", order.getOrderId());
    detail.put("payStatus", order.getPayStatus());
    detail.put("orderTime", order.getOrderTime());
    detail.put("tradeNo", order.getTradeNo());

    if (order.getMember() != null) {
        detail.put("customerName", order.getMember().getName()); 
        // 修正：確保 Key 名稱為 customerEmail
        detail.put("customerEmail", order.getMember().getEmail()); 
    } else {
        detail.put("customerName", "未知顧客");
        detail.put("customerEmail", "未提供 Email");
    }

    // 修正：確保 Key 名稱為 totalPrice，對應前端 order.totalPrice
    detail.put("totalPrice", calculateTotalAmount(order)); 

    List<Map<String, Object>> items = new ArrayList<>();
    if (order.getOrderDetails() != null) {
        for (OrdersDetailEntity item : order.getOrderDetails()) {
            Map<String, Object> itemMap = new HashMap<>();
            itemMap.put("ticketType", item.getTicketType());
            itemMap.put("ticketPrice", item.getTicketPrice() != null ? item.getTicketPrice() : 0);
            items.add(itemMap);
        }
    }
    detail.put("orderDetails", items);
    return detail;
}
    
   

           
}