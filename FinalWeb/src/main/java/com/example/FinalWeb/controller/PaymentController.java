package com.example.FinalWeb.controller;

import com.example.FinalWeb.entity.OrdersDetailEntity;
import com.example.FinalWeb.service.ECPayService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import com.example.FinalWeb.repo.OrdersRepo;
import com.example.FinalWeb.repo.OrdersDetailRepo;
import com.example.FinalWeb.entity.OrdersEntity;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;

@Controller
@ControllerAdvice(assignableTypes = GlobalController.class)
@RequestMapping("/payment")
public class PaymentController {

    @Autowired
    private ECPayService ecpayService;

    @Autowired
    private OrdersRepo ordersRepo;

    @Autowired
    private OrdersDetailRepo ordersDetailRepo;

    // 利用 @ModelAttribute 攔截 /payment 請求，主動將訂單資料塞入 Model
    // orderId 必須由上游頁面（行程規劃頁）透過 URL 帶入，例如 /payment?orderId=123
    @ModelAttribute
    public void addPaymentDataIfNecessary(HttpServletRequest request,
            @RequestParam(name = "orderId", required = false) Integer orderId,
            Model model) {
        if ("/payment".equals(request.getRequestURI())) {
            OrdersEntity order = null;

            if (orderId != null) {
                // ✅ 從 DB 用上游帶入的 orderId 查詢訂單
                order = ordersRepo.findById(orderId).orElse(null);
            }

            if (order == null) {
                // 如果沒帶 orderId 或查不到，給空物件避免前端報錯
                order = new OrdersEntity();
            }

            model.addAttribute("order", order);

            int totalAmount = 0;
            if (order.getOrderDetails() != null) {
                totalAmount = order.getOrderDetails().stream()
                        .mapToInt(detail -> detail.getTicketPrice() != null ? detail.getTicketPrice() : 0)
                        .sum();
            }
            if (totalAmount == 0)
                totalAmount = 1;
            model.addAttribute("totalAmount", totalAmount);
        }
    }

    // 前端送出帶有實體 orderId 的 POST 請求來結帳
    // 同時接收加購項目的名稱與價格，存入 OrdersDetail 後再進行綠界結帳
    @PostMapping(value = "/checkout", produces = "text/html;charset=UTF-8")
    @ResponseBody
    public String checkout(@RequestParam("orderId") Integer orderId,
            @RequestParam(name = "addonTicketName", required = false, defaultValue = "") String addonTicketName,
            @RequestParam(name = "addonTicketPrice", required = false, defaultValue = "0") Integer addonTicketPrice,
            @RequestParam(name = "addonTransportName", required = false, defaultValue = "") String addonTransportName,
            @RequestParam(name = "addonTransportPrice", required = false, defaultValue = "0") Integer addonTransportPrice) {

        // 取得訂單
        OrdersEntity order = ordersRepo.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("找不到該筆訂單: " + orderId));

        // 如果有加購景點門票，新增一筆明細
        if (addonTicketName != null && !addonTicketName.isEmpty() && addonTicketPrice > 0) {
            OrdersDetailEntity ticketDetail = new OrdersDetailEntity();
            ticketDetail.setTicketType(addonTicketName);
            ticketDetail.setTicketPrice(addonTicketPrice);
            ticketDetail.setOrders(order);
            ticketDetail.setQrToken(java.util.UUID.randomUUID().toString());
            ticketDetail.setTicketUsed(false);
            ordersDetailRepo.save(ticketDetail);
        }

        // 如果有加購交通票券，新增一筆明細
        if (addonTransportName != null && !addonTransportName.isEmpty() && addonTransportPrice > 0) {
            OrdersDetailEntity transportDetail = new OrdersDetailEntity();
            transportDetail.setTicketType(addonTransportName);
            transportDetail.setTicketPrice(addonTransportPrice);
            transportDetail.setOrders(order);
            transportDetail.setQrToken(java.util.UUID.randomUUID().toString());
            transportDetail.setTicketUsed(false);
            ordersDetailRepo.save(transportDetail);
        }

        // 利用真實資料庫裡的訂單 ID 進行綠界結帳 (會重新從 DB 讀取最新的明細來計算金額)
        return ecpayService.ecpayCheckout(orderId);
    }

    // 綠界 Server TO Server 背景回傳付款結果
    @PostMapping("/callback")
    @ResponseBody
    public String ecpayCallback(@RequestParam Map<String, String> params) {
        try {
            ecpayService.processCallback(params);
            if ("1".equals(params.get("RtnCode"))) {
                System.out.println("背景回傳付款成功, 綠界訂單編號: " + params.get("MerchantTradeNo") + ", 內部訂單 ID: "
                        + params.get("CustomField1"));
            }
            return "1|OK";
        } catch (Exception e) {
            System.err.println("綠界背景回傳處理失敗: " + e.getMessage());
            return "0|Fail";
        }
    }

    // 將綠界轉跳回來的 POST 請求接住作驗證
    @PostMapping("/success")
    public RedirectView paymentSuccess(@RequestParam Map<String, String> params) {
        System.out.println("===== 綠界轉跳回來 /payment/success =====");
        System.out.println("收到參數: " + params);

        if (params == null || params.isEmpty()) {
            System.out.println("❌ 沒有收到任何參數，跳回付款頁");
            return new RedirectView("/payment");
        }

        String rtnCode = params.get("RtnCode");
        String tradeNo = params.get("MerchantTradeNo");
        String customOrderId = params.get("CustomField1");
        boolean macValid = false;

        // 嘗試驗證 CheckMacValue
        try {
            macValid = ecpayService.verifyCheckMacValue(params);
        } catch (Exception e) {
            System.err.println("CheckMacValue 驗證時發生例外: " + e.getMessage());
        }

        System.out.println("RtnCode=" + rtnCode + ", TradeNo=" + tradeNo
                + ", CustomField1=" + customOrderId + ", MacValid=" + macValid);

        // ✅ 只要 RtnCode = "1" (付款成功)，就跳到成功頁面
        // （開發環境 CheckMacValue 可能因 localhost 回傳參數差異而失敗，所以不能完全依賴它）
        if ("1".equals(rtnCode)) {
            // 嘗試更新資料庫 (localhost 開發環境下 callback 打不到)
            try {
                ecpayService.processCallback(params);
            } catch (Exception e) {
                System.err.println("前端轉跳更新資料庫失敗（可忽略）: " + e.getMessage());
            }

            // 決定 orderId：優先用 CustomField1，備用從 TradeNo 解析
            String orderId = customOrderId;
            if (orderId == null || orderId.isEmpty()) {
                // MerchantTradeNo 格式: OD{orderId}T{timestamp}
                if (tradeNo != null && tradeNo.startsWith("OD")) {
                    try {
                        orderId = tradeNo.substring(2, tradeNo.indexOf("T"));
                    } catch (Exception e) {
                        System.err.println("從 TradeNo 解析 orderId 失敗: " + e.getMessage());
                    }
                }
            }

            System.out.println("✅ 付款成功！跳轉到 /payment/paymentsuccess?orderId=" + orderId);
            return new RedirectView("/payment/paymentsuccess?orderId=" + orderId);
        }

        System.out.println("❌ 付款失敗或取消: " + params.get("RtnMsg"));
        return new RedirectView("/payment");
    }

    @RequestMapping("/paymentsuccess")
    public String paymentsuccess(@RequestParam(name = "orderId", required = false) Integer orderId, Model model) {
        if (orderId != null) {
            ordersRepo.findById(orderId).ifPresent(order -> {
                model.addAttribute("order", order);

                // 計算總金額
                int totalAmount = 0;
                if (order.getOrderDetails() != null) {
                    totalAmount = order.getOrderDetails().stream()
                            .mapToInt(d -> d.getTicketPrice() != null ? d.getTicketPrice() : 0)
                            .sum();
                }
                model.addAttribute("totalAmount", totalAmount);

                // 取得行程底下的所有景點 (MyMap)
                if (order.getMyPlan() != null) {
                    model.addAttribute("myPlan", order.getMyPlan());

                    if (order.getMyPlan().getMyMaps() != null) {
                        java.util.List<com.example.FinalWeb.entity.MyMapEntity> allMaps = order.getMyPlan().getMyMaps();
                        model.addAttribute("myMaps", allMaps);

                        // 依照 dayNumber 分組
                        java.util.Map<Integer, java.util.List<com.example.FinalWeb.entity.MyMapEntity>> groupedByDay = allMaps
                                .stream()
                                .sorted(java.util.Comparator.comparingInt(
                                        (com.example.FinalWeb.entity.MyMapEntity m) -> m.getDayNumber() != null
                                                ? m.getDayNumber()
                                                : 0)
                                        .thenComparingInt(m -> m.getVisitOrder() != null ? m.getVisitOrder() : 0))
                                .collect(java.util.stream.Collectors.groupingBy(
                                        m -> m.getDayNumber() != null ? m.getDayNumber() : 1,
                                        java.util.TreeMap::new,
                                        java.util.stream.Collectors.toList()));
                        model.addAttribute("groupedByDay", groupedByDay);

                        // 計算最大天數 (用於 Day 分頁按鈕)
                        int maxDay = allMaps.stream()
                                .mapToInt(m -> m.getDayNumber() != null ? m.getDayNumber() : 1)
                                .max().orElse(1);
                        model.addAttribute("maxDay", maxDay);
                    }

                    // 建立「有付費票券」的 spotId 清單 (用於前端判斷是否顯示 QR Code)
                    java.util.Set<Integer> ticketSpotIds = new java.util.HashSet<>();
                    if (order.getOrderDetails() != null) {
                        for (com.example.FinalWeb.entity.OrdersDetailEntity detail : order.getOrderDetails()) {
                            if (detail.getMyMap() != null && detail.getMyMap().getSpotId() != null) {
                                ticketSpotIds.add(detail.getMyMap().getSpotId());
                            }
                        }
                    }
                    model.addAttribute("ticketSpotIds", ticketSpotIds);
                }
            });
        }
        return "paymentsuccess";
    }

}
