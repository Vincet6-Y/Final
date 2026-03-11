package com.example.FinalWeb.controller;

import com.example.FinalWeb.service.ECPayService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import com.example.FinalWeb.repo.OrdersRepo;
import com.example.FinalWeb.entity.OrdersEntity;
import java.util.Map;

import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;
import jakarta.servlet.http.HttpServletRequest;

@Controller
@ControllerAdvice(assignableTypes = MemberController.class)
@RequestMapping("/payment")
public class PaymentController {

    @Autowired
    private ECPayService ecpayService;

    @Autowired
    private OrdersRepo ordersRepo;

    // 利用 @ModelAttribute 攔截 /payment 請求，主動將訂單資料塞入 Model
    // 這樣 MemberController 的 return "payment" 就能順利拿到資料，前端就不會因為 null 報錯沒畫面了！
    @ModelAttribute
    public void addPaymentDataIfNecessary(HttpServletRequest request, 
            @RequestParam(name = "orderId", required = false, defaultValue = "1001") Integer orderId, 
            Model model) {
        if ("/payment".equals(request.getRequestURI())) {
            OrdersEntity order = ordersRepo.findById(orderId).orElse(new OrdersEntity());
            model.addAttribute("order", order);

            int totalAmount = 0;
            if (order.getOrderDetails() != null) {
                totalAmount = order.getOrderDetails().stream()
                        .mapToInt(detail -> detail.getTicketPrice() != null ? detail.getTicketPrice() : 0)
                        .sum();
            }
            if (totalAmount == 0) totalAmount = 1;
            model.addAttribute("totalAmount", totalAmount);
        }
    }

    // 前端送出帶有實體 orderId 的 POST 請求來結帳 (加上 produces="text/html;charset=UTF-8" 確保能執行綠界 JS)
    @PostMapping(value = "/checkout", produces = "text/html;charset=UTF-8")
    @ResponseBody
    public String checkout(@RequestParam("orderId") Integer orderId) {
        // 利用真實資料庫裡的訂單 ID 進行綠界結帳
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
