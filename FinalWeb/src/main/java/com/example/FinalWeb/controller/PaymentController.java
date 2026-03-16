package com.example.FinalWeb.controller;

import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.entity.MyMapEntity;
import com.example.FinalWeb.entity.OrdersEntity;
import com.example.FinalWeb.entity.MyPlanEntity;
import com.example.FinalWeb.entity.OrdersDetailEntity;
import com.example.FinalWeb.service.ECPayService;
import com.example.FinalWeb.service.OrderService;
import com.example.FinalWeb.service.TicketService;
import com.example.FinalWeb.dto.TicketDto;
import com.example.FinalWeb.repo.OrdersRepo;
import com.example.FinalWeb.repo.MyPlanRepo;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Controller
@ControllerAdvice(assignableTypes = GlobalController.class)
@RequestMapping("/payment")
public class PaymentController {

    @Autowired
    private ECPayService ecpayService;
    @Autowired
    private TicketService ticketService;
    @Autowired
    private OrderService orderService;
    @Autowired
    private OrdersRepo ordersRepo;
    @Autowired
    private MyPlanRepo myPlanRepo;

    @Value("${google.maps.api-key:NONE}")
    private String googleMapsApiKey;

    // 1. 建立未付款訂單
    @PostMapping("/createOrderFromPlan")
    @ResponseBody
    public ResponseEntity<?> createOrderFromPlan(@RequestParam("myPlanId") Integer myPlanId, HttpSession session) {
        try {
            MyPlanEntity myPlan = myPlanRepo.findById(myPlanId)
                    .orElseThrow(() -> new IllegalArgumentException("找不到對應的行程"));

            OrdersEntity order = new OrdersEntity();
            order.setMyPlan(myPlan);
            order.setOrderTime(java.time.LocalDateTime.now());
            order.setPayStatus("未付款");

            Object memberObj = session.getAttribute("loginMember");
            if (memberObj != null && memberObj instanceof MemberEntity) {
                order.setMember((MemberEntity) memberObj);
            } else if (myPlan.getMember() != null) {
                order.setMember(myPlan.getMember());
            }

            OrdersEntity savedOrder = ordersRepo.save(order);
            return ResponseEntity.ok(Map.of("success", true, "orderId", savedOrder.getOrderId()));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // 2. 攔截請求，提早準備好付款頁面的資料
    @ModelAttribute
    public void addPaymentDataIfNecessary(HttpServletRequest request,
            @RequestParam(name = "orderId", required = false) Integer orderId, Model model) {
        if ("/payment".equals(request.getRequestURI())) {
            OrdersEntity order = (orderId != null) ? ordersRepo.findById(orderId).orElse(new OrdersEntity())
                    : new OrdersEntity();
            model.addAttribute("order", order);

            // 呼叫 Service 算錢
            model.addAttribute("totalAmount", orderService.calculateTotalAmount(order));
            List<TicketDto> availableTickets = new ArrayList<>();
            if (order.getMyPlan() != null && order.getMyPlan().getMyMaps() != null) {
                List<MyMapEntity> planSpots = order.getMyPlan().getMyMaps();
                // 抓取對應景點的門票
                for (MyMapEntity myMap : planSpots) {
                    TicketDto ticket = ticketService.getTicketByPlaceId(myMap.getGooglePlaceId());
                    if (ticket != null) {
                        availableTickets.add(ticket);
                    }
                }
                // 呼叫 TicketService 取得智慧推薦的交通票，並傳給前端 Model
                List<TicketDto> recommendedTransports = ticketService.recommendTransportTickets(planSpots);
                model.addAttribute("recommendedTransports", recommendedTransports);
            }
            model.addAttribute("availableTickets", availableTickets);
        }
    }

    // 3. 執行結帳核心邏輯
    @PostMapping(value = "/checkout", produces = "text/html;charset=UTF-8")
    @ResponseBody
    public String checkout(@RequestParam("orderId") Integer orderId,
            @RequestParam(name = "newPlanName", required = false) String newPlanName,
            @RequestParam(name = "addonTicketName", required = false) List<String> addonTicketNames,
            @RequestParam(name = "addonTicketPrice", required = false) List<Integer> addonTicketPrices,
            @RequestParam(name = "transportIds", required = false) List<String> transportIds,
            @RequestParam(name = "newStartDate", required = false) String newStartDate,
            @RequestParam(name = "removeDetailIds", required = false) List<Integer> removeDetailIds) {

        // 取得訂單
        OrdersEntity order = orderService.getOrderById(orderId);

        // 修改行程名稱
        if (newPlanName != null && !newPlanName.trim().isEmpty() && order.getMyPlan() != null) {
            order.getMyPlan().setMyPlanName(newPlanName.trim());
            myPlanRepo.save(order.getMyPlan());
        }
        // 修改預計出發日期
        if (newStartDate != null && !newStartDate.isEmpty() && order.getMyPlan() != null) {
            order.getMyPlan().setStartDate(LocalDate.parse(newStartDate));
            myPlanRepo.save(order.getMyPlan());
        }

        // 呼叫 Service 把不要的舊票券刪掉
        orderService.removeOrderDetails(removeDetailIds);

        // 處理加購票券
        orderService.processAddonTickets(order, addonTicketNames, addonTicketPrices, transportIds);

        // 重新去資料庫抓最新的訂單(包含剛剛加購的明細)
        OrdersEntity updatedOrder = orderService.getOrderById(orderId);
        int currentTotalAmount = orderService.calculateTotalAmount(updatedOrder);

        // 金額為 0，直接轉跳成功頁
        if (currentTotalAmount == 0) {
            updatedOrder.setPayStatus("已完成(無須付款)");
            updatedOrder.setPayTime(java.time.LocalDateTime.now());
            ordersRepo.save(updatedOrder);
            return "<script>window.location.href='/payment/paymentsuccess?orderId=" + updatedOrder.getOrderId()
                    + "';</script>";
        }

        // 金額大於 0，呼叫綠界金流
        return ecpayService.ecpayCheckout(orderId);
    }

    // 4. 綠界背景回傳
    @PostMapping("/callback")
    @ResponseBody
    public String ecpayCallback(@RequestParam Map<String, String> params) {
        try {
            ecpayService.processCallback(params);
            if ("1".equals(params.get("RtnCode"))) {
                System.out.println("背景回傳付款成功: " + params.get("MerchantTradeNo"));
            }
            return "1|OK";
        } catch (Exception e) {
            System.err.println("綠界背景回傳處理失敗: " + e.getMessage());
            return "0|Fail";
        }
    }

    // 5. 綠界前端轉跳回傳
    @PostMapping("/success")
    public RedirectView paymentSuccess(@RequestParam Map<String, String> params) {
        if (params == null || params.isEmpty())
            return new RedirectView("/payment");

        String rtnCode = params.get("RtnCode");
        String customOrderId = params.get("CustomField1");
        String tradeNo = params.get("MerchantTradeNo");

        String orderId = customOrderId;
        if ((orderId == null || orderId.isEmpty()) && tradeNo != null && tradeNo.startsWith("OD")) {
            try {
                orderId = tradeNo.substring(2, tradeNo.indexOf("T"));
            } catch (Exception ignored) {
            }
        }

        if ("1".equals(rtnCode)) {
            try {
                ecpayService.processCallback(params);
            } catch (Exception ignored) {
            }
            return new RedirectView("/payment/paymentsuccess?orderId=" + orderId);
        }

        if (orderId != null && !orderId.isEmpty())
            return new RedirectView("/payment?orderId=" + orderId);
        return new RedirectView("/payment");
    }

    // 6. 成功畫面展示
    @RequestMapping("/paymentsuccess")
    public String paymentsuccess(@RequestParam(name = "orderId", required = false) Integer orderId, Model model) {
        model.addAttribute("apiKey", googleMapsApiKey);
        if (orderId != null) {
            ordersRepo.findById(orderId).ifPresent(order -> {
                model.addAttribute("order", order);

                // 呼叫 Service 算總金額
                model.addAttribute("totalAmount", orderService.calculateTotalAmount(order));

                if (order.getMyPlan() != null && order.getMyPlan().getMyMaps() != null) {
                    List<MyMapEntity> allMaps = order.getMyPlan().getMyMaps();
                    model.addAttribute("myPlan", order.getMyPlan());
                    model.addAttribute("myMaps", allMaps);

                    // 呼叫 Service 取得分組好的行程表
                    model.addAttribute("groupedByDay", orderService.groupMapsByDay(allMaps));

                    // 計算最大天數
                    int maxDay = allMaps.stream().mapToInt(m -> m.getDayNumber() != null ? m.getDayNumber() : 1).max()
                            .orElse(1);
                    model.addAttribute("maxDay", maxDay);

                    // 根據 startDate 跟 maxDay 算出結束日期
                    if (order.getMyPlan().getStartDate() != null) {
                        // 結束日期 = 出發日期 + (總天數 - 1) 天
                        LocalDate endDate = order.getMyPlan().getStartDate().plusDays(maxDay - 1);
                        model.addAttribute("endDate", endDate);
                    }
                }

                // 呼叫 Service 一次取得分類好的實體票與交通票
                Map<String, Object> classifiedTickets = orderService.classifyTickets(order);

                // 因為 Service 回傳的是 Object，我們需要做個安全的強制轉型再塞給 Model
                @SuppressWarnings("unchecked")
                Set<Integer> ticketSpotIds = (Set<Integer>) classifiedTickets.get("ticketSpotIds");
                @SuppressWarnings("unchecked")
                List<OrdersDetailEntity> transportTickets = (List<OrdersDetailEntity>) classifiedTickets
                        .get("transportTickets");

                model.addAttribute("ticketSpotIds", ticketSpotIds);
                model.addAttribute("transportTickets", transportTickets);
            });
        }
        return "paymentsuccess";
    }
}