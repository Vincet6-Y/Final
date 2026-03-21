package com.example.FinalWeb.service;

import java.util.*;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.ui.Model;

import com.example.FinalWeb.dto.MyMapDTO;
import com.example.FinalWeb.dto.TicketDto;
import com.example.FinalWeb.entity.MyMapEntity;
import com.example.FinalWeb.entity.OrdersDetailEntity;
import com.example.FinalWeb.entity.OrdersEntity;

@Service
public class PaymentService {

    @Autowired
    private OrderService orderService;
    @Autowired
    private TicketService ticketService;
    @Autowired
    private MyMapService myMapService;

    /** 準備付款頁所需的全部 Model 資料 */
    public void populatePaymentModel(Model model, OrdersEntity order) {
        model.addAttribute("order", order);
        model.addAttribute("totalAmount", orderService.calculateTotalAmount(order));
        model.addAttribute("purchasedNames", extractPurchasedNames(order));

        List<TicketDto> availableTickets = new ArrayList<>();
        List<TicketDto> recommendedTransports = new ArrayList<>();

        if (order.getMyPlan() != null && order.getMyPlan().getMyMaps() != null) {
            List<MyMapEntity> spots = order.getMyPlan().getMyMaps();
            for (MyMapEntity myMap : spots) {
                TicketDto t = ticketService.getTicketByPlaceId(myMap.getGooglePlaceId());
                if (t != null)
                    availableTickets.add(t);
            }
            // 先算智慧推薦
            recommendedTransports = ticketService.recommendTransportTickets(spots);
        }
        // 2. 再算「其他票」= 全部排除推薦的
        List<TicketDto> otherTransports = ticketService.getOtherTransportTickets(recommendedTransports);

        model.addAttribute("availableTickets", availableTickets);
        model.addAttribute("recommendedTransports", recommendedTransports);
        model.addAttribute("otherTransports", otherTransports);
    }

    /** 準備付款成功頁所需的全部 Model 資料 */
    public void populateSuccessModel(Model model, OrdersEntity order) {
        model.addAttribute("order", order);
        model.addAttribute("totalAmount", orderService.calculateTotalAmount(order));

        Map<String, Object> classified = orderService.classifyTickets(order);
        Set<Integer> ticketSpotIds = (Set<Integer>) classified.get("ticketSpotIds");
        List<OrdersDetailEntity> transportTickets = (List<OrdersDetailEntity>) classified.get("transportTickets");

        model.addAttribute("ticketSpotIds", ticketSpotIds);
        model.addAttribute("transportTickets", transportTickets);

        if (order.getMyPlan() != null && order.getMyPlan().getMyMaps() != null) {
            List<Integer> idList = new ArrayList<>(ticketSpotIds);
            List<MyMapDTO> dtoList = order.getMyPlan().getMyMaps().stream()
                    .map(e -> myMapService.convertToDto(e, idList))
                    .sorted(Comparator
                            .comparingInt((MyMapDTO m) -> m.getDayNumber() != null ? m.getDayNumber() : 1)
                            .thenComparingInt(m -> m.getVisitOrder() != null ? m.getVisitOrder() : 0))
                    .collect(Collectors.toList());

            Map<Integer, List<MyMapDTO>> groupedByDay = dtoList.stream()
                    .collect(Collectors.groupingBy(
                            m -> m.getDayNumber() != null ? m.getDayNumber() : 1,
                            TreeMap::new, Collectors.toList()));

            int maxDay = dtoList.stream()
                    .mapToInt(m -> m.getDayNumber() != null ? m.getDayNumber() : 1).max().orElse(1);

            model.addAttribute("myPlan", order.getMyPlan());
            model.addAttribute("groupedByDay", groupedByDay);
            model.addAttribute("maxDay", maxDay);

            if (order.getMyPlan().getStartDate() != null) {
                model.addAttribute("endDate",
                        order.getMyPlan().getStartDate().plusDays(maxDay - 1));
            }
        }
    }

    // ── 私有小工具 ──────────────────────────────────────────────
    private Set<String> extractPurchasedNames(OrdersEntity order) {
        if (order.getOrderDetails() == null)
            return Collections.emptySet();
        return order.getOrderDetails().stream()
                .filter(d -> d.getTicketType() != null)
                .map(OrdersDetailEntity::getTicketType)
                .collect(Collectors.toSet());
    }
}