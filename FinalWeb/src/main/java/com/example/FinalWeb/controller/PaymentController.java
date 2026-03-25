package com.example.FinalWeb.controller;

import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.entity.OrdersEntity;
import com.example.FinalWeb.entity.MyPlanEntity;
import com.example.FinalWeb.service.ECPayService;
import com.example.FinalWeb.service.OrderService;
import com.example.FinalWeb.service.PaymentService;
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
import jakarta.servlet.http.HttpSession;
import jakarta.transaction.Transactional;

import java.time.*;
import java.util.*;

@Controller
@RequestMapping("/payment")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;
    @Autowired
    private OrderService orderService;
    @Autowired
    private ECPayService ecpayService;
    @Autowired
    private OrdersRepo ordersRepo;
    @Autowired
    private MyPlanRepo myPlanRepo;

    @Value("${google.maps.api-key:NONE}")
    private String googleMapsApiKey;

    // 顯示付款頁
    @GetMapping
    public String showPaymentPage(
            @RequestParam(required = false) Integer orderId, Model model) {
        OrdersEntity order = orderId != null
                ? ordersRepo.findById(orderId).orElse(new OrdersEntity())
                : new OrdersEntity();
        paymentService.populatePaymentModel(model, order);
        return "payMent";
    }

    // 建立未付款訂單
    @PostMapping("/createOrderFromPlan")
    @ResponseBody
    public ResponseEntity<?> createOrderFromPlan(
            @RequestParam Integer myPlanId,
            @RequestParam(required = false) String startDate,
            HttpSession session) {
        try {
            MyPlanEntity myPlan = myPlanRepo.findById(myPlanId)
                    .orElseThrow(() -> new IllegalArgumentException("找不到對應的行程"));

            if (startDate != null && !startDate.isBlank()) {
                myPlan.setStartDate(LocalDate.parse(startDate.replace("/", "-")));
                myPlanRepo.save(myPlan);
            }

            OrdersEntity order = new OrdersEntity();
            order.setMyPlan(myPlan);
            order.setOrderTime(LocalDateTime.now());
            order.setPayStatus("未付款");

            MemberEntity member = (MemberEntity) session.getAttribute("loginMember");
            order.setMember(member != null ? member : myPlan.getMember());

            OrdersEntity saved = ordersRepo.save(order);
            return ResponseEntity.ok(Map.of("success", true, "orderId", saved.getOrderId()));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // 執行結帳核心邏輯
    @PostMapping(value = "/checkout", produces = "text/html;charset=UTF-8")
    @ResponseBody
    @Transactional
    public String checkout(
            @RequestParam Integer orderId,
            @RequestParam(required = false) String newPlanName,
            @RequestParam(required = false) List<String> addonTicketNames,
            @RequestParam(required = false) List<Integer> addonTicketPrices,
            @RequestParam(required = false) List<String> transportIds,
            @RequestParam(required = false) String newStartDate,
            @RequestParam(required = false) List<Integer> removeDetailIds) {

        OrdersEntity order = orderService.getOrderById(orderId);
        orderService.applyPlanChanges(order, newPlanName, newStartDate);
        orderService.removeOrderDetails(removeDetailIds);
        orderService.processAddonTickets(order, addonTicketNames, addonTicketPrices, transportIds);

        OrdersEntity updated = orderService.getOrderById(orderId);
        int total = orderService.calculateTotalAmount(updated);

        if (total == 0) {
            updated.setPayStatus("已完成(無須付款)");
            updated.setPayTime(LocalDateTime.now());
            ordersRepo.save(updated);
            return "<script>window.location.href='/payment/paymentsuccess?orderId="
                    + updated.getOrderId() + "';</script>";
        }
        return ecpayService.ecpayCheckout(orderId);
    }

    // 綠界背景回傳
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

    // 綠界前端轉跳回傳
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
    @GetMapping("/paymentsuccess")
    public String paymentsuccess(
            @RequestParam(required = false) Integer orderId, Model model) {
        model.addAttribute("apiKey", googleMapsApiKey);
        ordersRepo.findById(orderId)
                .ifPresent(order -> paymentService.populateSuccessModel(model, order));
        return "paymentsuccess";
    }
}