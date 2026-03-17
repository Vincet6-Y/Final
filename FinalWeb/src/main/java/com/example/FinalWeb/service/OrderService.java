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
    public List<OrdersEntity> getAllOrdersForAdmin(String status, String keyword) {
    // 🌟 修正：處理關鍵字搜尋
    if (keyword != null && !keyword.trim().isEmpty()) {
        return ordersRepo.findByTradeNoContaining(keyword.trim()); 
    }
    
    // 處理狀態篩選
    if (status != null && !status.equals("全部")) {
        return ordersRepo.findByPayStatusOrderByOrderTimeDesc(status);
    }
    
    // 預設回傳全部
    return ordersRepo.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "orderTime"));
}

// 🌟 5. 給管理後台：更新訂單狀態 (退款、出貨等操作)
@Transactional
public void updateOrderStatus(Integer orderId, String newStatus) {
    OrdersEntity order = getOrderById(orderId);
    order.setPayStatus(newStatus);
    ordersRepo.save(order);
}
}