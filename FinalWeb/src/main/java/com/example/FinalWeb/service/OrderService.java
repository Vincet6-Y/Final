package com.example.FinalWeb.service;

import java.time.LocalDate;
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
import com.example.FinalWeb.repo.MyPlanRepo;
import com.example.FinalWeb.dto.TicketDto;

@Service
public class OrderService {

    @Autowired
    private OrdersRepo ordersRepo;

    @Autowired
    private TicketService ticketService;

    @Autowired
    private MyPlanRepo myPlanRepo;

    // 建立新訂單
    // 在同一個資料庫交易中執行，如果 全部成功，就存入資料庫，如果其中一個失敗，就全部取消
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

    // 取得訂單
    public OrdersEntity getOrderById(Integer orderId) {
        return ordersRepo.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("找不到該筆訂單 ID: " + orderId));
    }

    // 會員訂單列表
    public List<OrdersEntity> getMemberOrders(Integer memberId) {
        return ordersRepo.findByMember_MemberIdOrderByOrderTimeDesc(memberId);
    }

    // 計算訂單總金額
    public int calculateTotalAmount(OrdersEntity order) {
        if (order == null || order.getOrderDetails() == null) {
            return 0;
        }
        return order.getOrderDetails().stream()
                .mapToInt(detail -> detail.getTicketPrice() != null ? detail.getTicketPrice() : 0)
                .sum();
    }

    // 處理訂單的附加票券(加購門票與交通票)
    @Transactional
    public void processAddonTickets(OrdersEntity order, List<String> ticketNames, List<Integer> ticketPrices,
            List<String> transportIds) {
        if (order.getOrderDetails() == null) {
            order.setOrderDetails(new ArrayList<>());
        }

        // --- 1. 處理多張景點門票 ---
        if (ticketNames != null && ticketPrices != null && ticketNames.size() == ticketPrices.size()) {
            for (int i = 0; i < ticketNames.size(); i++) {
                String tName = ticketNames.get(i);
                Integer tPrice = ticketPrices.get(i);
                if (tName != null && !tName.isEmpty() && tPrice != null && tPrice > 0) {
                    OrdersDetailEntity detail = createNewTicketDetail(order, tName, tPrice);
                    order.getOrderDetails().add(detail);
                }
            }
        }

        // --- 2. 處理多張交通票 ---
        if (transportIds != null && !transportIds.isEmpty()) {
            for (String tId : transportIds) {
                TicketDto tInfo = ticketService.getTicketById(tId);
                if (tInfo != null) {
                    OrdersDetailEntity transportDetail = createNewTicketDetail(order, tInfo.getTicketName(),
                            tInfo.getPrice());
                    order.getOrderDetails().add(transportDetail);
                }
            }
        }
    }

    // 刪除使用者在結帳頁面取消的「舊票券」
    @Transactional
    public void removeOrderDetails(OrdersEntity order, List<Integer> detailIds) {
        if (detailIds != null && !detailIds.isEmpty() && order.getOrderDetails() != null) {
            order.getOrderDetails().removeIf(detail -> detailIds.contains(detail.getOrderDetailId()));
        }
    }

    // 私有小工具：幫忙建立票券實體
    private OrdersDetailEntity createNewTicketDetail(OrdersEntity order, String name, Integer price) {
        OrdersDetailEntity detail = new OrdersDetailEntity();
        detail.setTicketType(name);
        detail.setTicketPrice(price);
        detail.setOrders(order);
        detail.setQrToken(UUID.randomUUID().toString());
        detail.setTicketUsed(false);
        return detail;
    }

    // 把行程地點依照「第幾天」分組，並且先排序
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

    // 分類票券
    // 專門用來取得「景點門票的 SpotId 集合」
    public Set<Integer> getTicketSpotIds(OrdersEntity order) {
        // 1. 建立一個空的 HashSet 來存放結果
        Set<Integer> ticketSpotIds = new HashSet<>();

        // 2. 檢查訂單明細是否為空
        if (order.getOrderDetails() != null) {
            // 3. 走訪這筆訂單裡的每一個明細項目
            for (OrdersDetailEntity detail : order.getOrderDetails()) {

                // 4. 判斷 A：如果明細本身就帶有 MyMap 關聯，且有 spotId，直接加入
                if (detail.getMyMap() != null && detail.getMyMap().getSpotId() != null) {
                    ticketSpotIds.add(detail.getMyMap().getSpotId());
                }
                // 5. 判斷 B：如果沒有直接關聯，但有票券名稱，則去行程(MyPlan)裡比對
                else if (detail.getTicketType() != null && order.getMyPlan() != null
                        && order.getMyPlan().getMyMaps() != null) {
                    // 6. 走訪行程裡的所有景點
                    for (MyMapEntity m : order.getMyPlan().getMyMaps()) {
                        // 7. 透過 Google Place ID 查詢該景點對應的票券資訊
                        TicketDto tInfo = ticketService.getTicketByPlaceId(m.getGooglePlaceId());

                        // 8. 如果票券存在，且名稱與訂單明細的名稱相同，代表這是一張景點票
                        if (tInfo != null && detail.getTicketType().equals(tInfo.getTicketName())) {
                            ticketSpotIds.add(m.getSpotId()); // 將該景點的 SpotId 加入集合
                            break; // 已經找到了，提早結束這個小迴圈以節省效能
                        }
                    }
                }
            }
        }
        return ticketSpotIds;
    }

    // 專門用來取得「交通票的實體清單」
    public List<OrdersDetailEntity> getTransportTickets(OrdersEntity order) {
        // 1. 建立一個空的 ArrayList 來存放交通票
        List<OrdersDetailEntity> transportTickets = new ArrayList<>();

        // 2. 一樣先防呆，確保訂單明細不是空的
        if (order.getOrderDetails() != null) {
            // 3. 走訪這筆訂單裡的每一個明細項目
            for (OrdersDetailEntity detail : order.getOrderDetails()) {
                // 4. 預設這張票「不是」景點票 (標記變數)
                boolean isSpotTicket = false;

                // 5. 判斷邏輯與上面相同：檢查它是不是景點票
                if (detail.getMyMap() != null && detail.getMyMap().getSpotId() != null) {
                    isSpotTicket = true; // 確認為景點票
                } else if (detail.getTicketType() != null && order.getMyPlan() != null
                        && order.getMyPlan().getMyMaps() != null) {
                    for (MyMapEntity m : order.getMyPlan().getMyMaps()) {
                        TicketDto tInfo = ticketService.getTicketByPlaceId(m.getGooglePlaceId());
                        if (tInfo != null && detail.getTicketType().equals(tInfo.getTicketName())) {
                            isSpotTicket = true; // 確認為景點票
                            break;
                        }
                    }
                }

                // 6. 核心邏輯：如果它「不是」景點票，那就把它歸類為交通票
                if (!isSpotTicket) {
                    transportTickets.add(detail); // 加入交通票清單
                }
            }
        }
        return transportTickets;
    }

    // 處理修改行程名稱與日期
    @Transactional
    public void applyPlanChanges(OrdersEntity order, String newName, String newStartDate) {
        if (order.getMyPlan() == null)
            return;
        boolean dirty = false;

        if (newName != null && !newName.isBlank()) {
            order.getMyPlan().setMyPlanName(newName.trim());
            dirty = true;
        }
        if (newStartDate != null && !newStartDate.isBlank()) {
            order.getMyPlan().setStartDate(LocalDate.parse(newStartDate));
            dirty = true;
        }
        if (dirty)
            myPlanRepo.save(order.getMyPlan());
    }

}