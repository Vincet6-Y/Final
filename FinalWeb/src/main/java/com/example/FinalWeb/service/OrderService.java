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

    @Autowired
    private MyPlanRepo myPlanRepo;

    // 建立新訂單
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

    // 給會員首頁用的，負責把這個會員的訂單撈出來並排序
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

    // 處理前端傳來的加購門票與交通票 (支援購物車多選！)
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

    // 刪除使用者在結帳頁面取消的「舊票券」
    @Transactional
    public void removeOrderDetails(List<Integer> detailIds) {
        if (detailIds != null && !detailIds.isEmpty()) {
            ordersDetailRepo.deleteAllById(detailIds);
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

    // 分組行程
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