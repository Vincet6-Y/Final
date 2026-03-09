package com.example.FinalWeb.controller;
import com.example.FinalWeb.service.ECPayService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import java.util.Map;

@RestController
@RequestMapping("/payment")
public class PaymentController {

    @Autowired
    private ECPayService ecpayService;

    // 前端 payment.html 將 Form 送來的地方
    @PostMapping("/checkout")
    public String checkout(@RequestParam(required = false, defaultValue = "20900") int amount) {
        String orderId = "ORDER" + System.currentTimeMillis();
        String itemName = "日本關西必遊路線_京都大阪奈良六天五夜";
        return ecpayService.ecpayCheckout(orderId, amount, itemName);
    }

    // 綠界 Server TO Server 背景回傳付款結果
    @PostMapping("/callback")
    public String ecpayCallback(@RequestParam Map<String, String> params) {
        if (ecpayService.verifyCheckMacValue(params)) {
            if ("1".equals(params.get("RtnCode"))) {
                // TODO: 將該筆 orderId 的 payStatus 狀態改為 'success'
                String orderId = params.get("MerchantTradeNo");
                System.out.println("背景回傳付款成功, 訂單編號: " + orderId);
            }
            return "1|OK";
        }
        return "0|Fail";
    }

    // 將綠界轉跳回來的 POST 請求接住作驗證
    @PostMapping("/success")
    public RedirectView paymentSuccess(@RequestParam Map<String, String> params) {
        if (params != null && !params.isEmpty() && ecpayService.verifyCheckMacValue(params)) {
            // "1" 代表付款成功
            if ("1".equals(params.get("RtnCode"))) {
                String orderId = params.get("MerchantTradeNo");
                System.out.println("前端綠界轉跳回來！付款成功, 訂單編號: " + orderId);
                return new RedirectView("/paymentsuccess");
            } else {
                System.out.println("前端綠界轉跳回來！付款失敗或取消: " + params.get("RtnMsg"));
            }
        }
        // 反之 (包含點選取消)，全部跳回結帳頁面
        return new RedirectView("/payment");
    }

}
