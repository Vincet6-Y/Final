package com.example.FinalWeb.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.example.FinalWeb.entity.OrdersEntity;
import com.example.FinalWeb.repo.OrdersRepo;
import com.example.FinalWeb.util.ECPayUtil;

import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
public class ECPayService {

    private final static String ECPAY_URL = "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";

    // 從application.properties 讀取
    @Value("${app.base-url}")
    private String baseUrl;

    @Autowired
    private OrdersRepo ordersRepo;

    public String ecpayCheckout(Integer orderId) {
        // 從資料庫撈出訂單
        OrdersEntity order = ordersRepo.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("找不到該筆訂單: " + orderId));

        Map<String, String> params = new TreeMap<>();
        String time = new SimpleDateFormat("yyyy/MM/dd HH:mm:ss").format(new Date());

        // 將時間戳轉成 36 進制，會從 13 位數字變成約 8-9 位的英文+數字
        // 組合：前綴(2) + 訂單ID(可變) + 縮時字串(9)，存入資料庫並送出
        String compactTime = Long.toString(System.currentTimeMillis(), 36).toUpperCase();
        String merchantTradeNo = "OD" + order.getOrderId() + compactTime;
        order.setTradeNo(merchantTradeNo);
        ordersRepo.save(order);

        // 訂單明細加總
        int totalAmount = 0;
        if (order.getOrderDetails() != null) {
            totalAmount = order.getOrderDetails().stream()
                    .mapToInt(detail -> detail.getTicketPrice() != null ? detail.getTicketPrice() : 0)
                    .sum();
        }
        // 綠界 不允許 0 元交易，所以最小設1
        if (totalAmount <= 0)
            totalAmount = 1;

        // 綠界參數-綠界商店編號、商家交易編號、交易時間、交易金額、交易描述
        params.put("MerchantID", "3002607");
        params.put("MerchantTradeNo", merchantTradeNo);
        params.put("MerchantTradeDate", time);
        params.put("PaymentType", "aio");
        params.put("TotalAmount", String.valueOf(totalAmount));
        params.put("TradeDesc", "聖地巡禮行程訂單");

        // 利用 CustomField 欄位傳遞實際 orderId，讓回傳 Callback 時方便存取
        params.put("CustomField1", String.valueOf(order.getOrderId()));

        // 如果明細不為空，則組合字串為商品名稱
        String itemName = "聖地巡禮行程";
        if (order.getOrderDetails() != null && !order.getOrderDetails().isEmpty()) {
            itemName = order.getOrderDetails().stream()
                    .map(detail -> detail.getTicketType() != null ? detail.getTicketType() : "未定義票券")
                    .collect(Collectors.joining("#"));
            // 綠界限制 ItemName 不能過長
            if (itemName.length() > 100) {
                itemName = itemName.substring(0, 100) + "...";
            }
        }
        params.put("ItemName", itemName);
        params.put("ReturnURL", baseUrl + "/payment/callback"); // 綠界 Server-to-Server 背景回傳
        params.put("ClientBackURL", baseUrl + "/"); // 綠界付款畫面上的「返回商店」會導回首頁
        params.put("OrderResultURL", baseUrl + "/payment/success"); // 綠界付款完成後轉跳頁面
        params.put("ChoosePayment", "Credit");
        params.put("EncryptType", "1");

        // 產生 CheckMacValue
        String checkMacValue = ECPayUtil.generateCheckMacValue(params);
        params.put("CheckMacValue", checkMacValue);

        // 產生自定 HTML Form，直接帶有 JavaScript 自動送出
        StringBuilder form = new StringBuilder();
        form.append("<form id='ecpay-form' action='").append(ECPAY_URL).append("' method='POST'>");
        for (Map.Entry<String, String> entry : params.entrySet()) {
            form.append("<input type='hidden' name='").append(entry.getKey()).append("' value='")
                    .append(entry.getValue()).append("' />");
        }
        form.append("</form>");
        form.append("<script>document.getElementById('ecpay-form').submit();</script>");

        return form.toString();
    }

    // 用於接收綠界 ReturnURL Callback 後，處理訂單狀態商業邏輯
    public void processCallback(Map<String, String> params) {
        if (!verifyCheckMacValue(params)) {
            throw new IllegalArgumentException("CheckMacValue 驗證失敗");
        }

        // 交易成功 RtnCode 才為 "1"
        if ("1".equals(params.get("RtnCode"))) {
            String customField1 = params.get("CustomField1");
            if (customField1 != null) {
                Integer orderId = Integer.valueOf(customField1);
                ordersRepo.findById(orderId).ifPresent(order -> {
                    order.setPayStatus("已付款");
                    order.setPaymentType(params.get("PaymentType"));

                    String payTimeStr = params.get("PaymentDate"); // ECPay 日期格式: yyyy/MM/dd HH:mm:ss
                    if (payTimeStr != null) {
                        try {
                            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss");
                            order.setPayTime(LocalDateTime.parse(payTimeStr, formatter));
                        } catch (Exception e) {
                            order.setPayTime(LocalDateTime.now());
                        }
                    } else {
                        order.setPayTime(LocalDateTime.now());
                    }
                    ordersRepo.save(order);
                });
            }
        }
    }

    public boolean verifyCheckMacValue(Map<String, String> params) {
        return ECPayUtil.verifyCheckMacValue(params);
    }
}
