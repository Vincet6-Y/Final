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

    // 前端送出帶有實體 orderId 的 POST 請求來結帳
    @PostMapping("/checkout")
    public String checkout(@RequestParam("orderId") Integer orderId) {
        // 利用真實資料庫裡的訂單 ID 進行綠界結帳
        return ecpayService.ecpayCheckout(orderId);
    }

    // 綠界 Server TO Server 背景回傳付款結果
    @PostMapping("/callback")
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
        if (params != null && !params.isEmpty() && ecpayService.verifyCheckMacValue(params)) {
            // "1" 代表付款成功
            if ("1".equals(params.get("RtnCode"))) {
                String orderId = params.get("MerchantTradeNo");
                System.out.println("前端綠界轉跳回來！付款成功, 綠界訂單編號: " + orderId);

                // 【關鍵修改】在 localhost 開發環境下，綠界伺服器無法打到你的 /callback
                // 所以我們直接在前端轉跳 /success 時，也去呼叫更新資料庫的邏輯！
                try {
                    ecpayService.processCallback(params);
                } catch (Exception e) {
                    System.err.println("前端轉跳更新資料庫失敗: " + e.getMessage());
                }

                return new RedirectView("/paymentsuccess");
            } else {
                System.out.println("前端綠界轉跳回來！付款失敗或取消: " + params.get("RtnMsg"));
            }
        }
        // 反之 (包含點選取消)，全部跳回結帳頁面
        return new RedirectView("/payment");
    }

}
