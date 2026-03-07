package com.example.FinalWeb.service;

import org.springframework.stereotype.Service;
import com.example.FinalWeb.util.ECPayUtil;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Map;
import java.util.TreeMap;

@Service
public class ECPayService {

    private final static String ECPAY_URL = "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";

    public String ecpayCheckout(String orderId, int amount, String itemName) {
        Map<String, String> params = new TreeMap<>();
        String time = new SimpleDateFormat("yyyy/MM/dd HH:mm:ss").format(new Date());

        params.put("MerchantID", "3002607"); // 綠界測試環境特店編號 (專門用來測試 3D 驗證成功)
        params.put("MerchantTradeNo", orderId);
        params.put("MerchantTradeDate", time);
        params.put("PaymentType", "aio");
        params.put("TotalAmount", String.valueOf(amount));
        params.put("TradeDesc", "聖地巡禮行程");
        params.put("ItemName", itemName);
        /*
         * params.put("ReturnURL",
         * "https://your-ngrok-url.ngrok-free.app/payment/callback"); // 替換為實際伺服器能收到的
         * Callback URL // (可搭配 ngrok)
         */
        params.put("ReturnURL", "http://localhost:8080/payment/callback"); // 綠界 Server-to-Server 背景回傳
        params.put("ClientBackURL", "http://localhost:8080"); // 綠界付款畫面上的「返回商店」會導回首頁
        params.put("OrderResultURL", "http://localhost:8080/payment/success"); // 綠界付款完成後轉跳防偽驗證區
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

    public boolean verifyCheckMacValue(Map<String, String> params) {
        return ECPayUtil.verifyCheckMacValue(params);
    }
}
