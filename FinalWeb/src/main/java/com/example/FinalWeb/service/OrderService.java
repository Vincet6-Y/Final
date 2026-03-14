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

@Service
public class OrderService {

    @Autowired
    private OrdersRepo ordersRepo;

    @Autowired
    private OrdersDetailRepo ordersDetailRepo;

    @Autowired
    private TicketService ticketService;

    /**
     * 【邏輯】建立新訂單 (包含多筆票券明細)
     */
    @Transactional
    public OrdersEntity createOrder(MemberEntity member, MyPlanEntity myPlan, List<OrdersDetailEntity> ticketCart) {
        OrdersEntity newOrder = new OrdersEntity();
        newOrder.setMember(member);
        newOrder.setMyPlan(myPlan);
        newOrder.setPayStatus("未付款");
        newOrder.setOrderTime(LocalDateTime.now());

        if (ticketCart != null && !ticketCart.isEmpty()) {
            for (OrdersDetailEntity ticket : ticketCart) {
                ticket.setOrders(newOrder); // 告訴每一張票券「你的主人是誰」
            }
        }
        newOrder.setOrderDetails(ticketCart);
        return ordersRepo.save(newOrder); // 一鍵存檔
    }

    /**
     * 【邏輯】根據訂單 ID 尋找訂單，找不到就拋出例外
     */
    public OrdersEntity getOrderById(Integer orderId) {
        return ordersRepo.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("找不到該筆訂單 ID: " + orderId));
    }

    /**
     * 【邏輯】計算訂單的總金額
     */
    public int calculateTotalAmount(OrdersEntity order) {
        if (order == null || order.getOrderDetails() == null) {
            return 0;
        }
        // 將明細攤開，抽出票價後加總
        return order.getOrderDetails().stream()
                .mapToInt(detail -> detail.getTicketPrice() != null ? detail.getTicketPrice() : 0)
                .sum();
    }

    /**
     * 【邏輯】處理前端傳來的加購門票與交通票，並存入資料庫
     */
    @Transactional
    public void processAddonTickets(OrdersEntity order, List<String> ticketNames, List<Integer> ticketPrices,
            String transportName, Integer transportPrice) {
        // 處理多張景點門票
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
        // 處理單張交通票
        if (transportName != null && !transportName.isEmpty() && transportPrice != null && transportPrice > 0) {
            OrdersDetailEntity transportDetail = createNewTicketDetail(order, transportName, transportPrice);
            ordersDetailRepo.save(transportDetail);
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

    /**
     * 【邏輯】將行程景點依照「天數 (dayNumber)」與「順序」進行分組
     */
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

    /**
     * 【邏輯】分類票券：將訂單內的票券分為「有對應景點的(回傳 spotId)」與「純交通票」
     * 回傳一個 Map 讓 Controller 可以一次拿走這兩包資料
     */
    public Map<String, Object> classifyTickets(OrdersEntity order) {
        Set<Integer> ticketSpotIds = new HashSet<>();
        List<OrdersDetailEntity> transportTickets = new ArrayList<>();

        if (order.getOrderDetails() != null) {
            for (OrdersDetailEntity detail : order.getOrderDetails()) {
                boolean isSpotTicket = false;

                // 情況一：這張票本來就綁定某個景點
                if (detail.getMyMap() != null && detail.getMyMap().getSpotId() != null) {
                    ticketSpotIds.add(detail.getMyMap().getSpotId());
                    isSpotTicket = true;
                }
                // 情況二：這張票是加購的，我們去行程景點裡面找有沒有名字一樣的
                else if (detail.getTicketType() != null && order.getMyPlan() != null
                        && order.getMyPlan().getMyMaps() != null) {
                    for (MyMapEntity m : order.getMyPlan().getMyMaps()) {
                        TicketService.TicketInfo tInfo = ticketService.getTicketByPlaceId(m.getGooglePlaceId());
                        if (tInfo != null && detail.getTicketType().equals(tInfo.ticketName)) {
                            ticketSpotIds.add(m.getSpotId());
                            isSpotTicket = true;
                            break;
                        }
                    }
                }

                // 如果都不是，那它就是交通票
                if (!isSpotTicket) {
                    transportTickets.add(detail);
                }
            }
        }

        // 打包回傳
        Map<String, Object> result = new HashMap<>();
        result.put("ticketSpotIds", ticketSpotIds);
        result.put("transportTickets", transportTickets);
        return result;
    }
}