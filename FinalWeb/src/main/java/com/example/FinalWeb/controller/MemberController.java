package com.example.FinalWeb.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;

import com.example.FinalWeb.repo.OrdersRepo;

@RequestMapping("/")
@Controller
public class MemberController {

    @Autowired
    private OrdersRepo ordersRepo;

    // @Autowired
    // private JdbcTemplate jdbcTemplate;

    @RequestMapping("/test")
    public String test() {
        // try {
        // // 我們請小弟去執行一句最廢話的 SQL：「SELECT 1」
        // // 它的邏輯是：如果 TiDB 有乖乖連上且醒著，它就一定會回傳數字 1
        // Integer dbAnswer = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        // // 如果沒報錯走到這行，我們就在下方的 Console (終端機) 印出超大聲的慶祝訊息！
        // System.out.println("=========================================");
        // System.out.println("🎉 太神啦！成功連線到 TiDB 雲端資料庫！");
        // System.out.println("📡 資料庫平安回應了數字：" + dbAnswer);
        // System.out.println("=========================================");
        // } catch (Exception e) {
        // // 如果密碼打錯、網路斷掉，就會跳到這裡，印出失敗原因
        // System.out.println("🚨 糟糕，資料庫連線失敗了！");
        // System.out.println("👉 失敗原因：" + e.getMessage());
        // }
        // 🌟 步驟三：照常把網頁端給客人
        return "backendcontentmanagement";
    }

    @RequestMapping("/home")
    public String home() {
        return "home";
    }

    @RequestMapping("/packageTour")
    public String packageTour() {
        return "packageTour";
    }

    @RequestMapping("/packagetourdetail")
    public String packagetourdetail() {
        return "packagetourdetail";
    }

    @RequestMapping("/article")
    public String article() {
        return "article";
    }

    // 1. 注入 application.properties 裡設定的金鑰變數
    @Value("${google.maps.api-key:NONE}")
    private String googleMapsApiKey;

    // 2. 修改原本的 packageTourMap 方法
    @RequestMapping("/packageTourMap")
    public String packageTourMap(Model model) {
        // 將金鑰存入 model，這樣前端 Thymeleaf 才能抓到
        model.addAttribute("apiKey", googleMapsApiKey);
        return "packageTourMap";
    }

    @RequestMapping("/register")
    public String register() {
        return "register";
    }

    @RequestMapping("/member")
    public String member() {
        return "member";
    }

    @RequestMapping("/login")
    public String login() {
        return "login";
    }

    @RequestMapping("/news")
    public String news() {
        return "news";
    }

    @RequestMapping("/info")
    public String info() {
        return "info";
    }

    // @RequestMapping("/payment")
    // public String payment(@RequestParam(required = false) Integer orderId, Model
    // model) {
    // // 真實的情境下，可能是由購物車那邊建立好訂單，並將 orderId 帶過來
    // if (orderId != null) {
    // ordersRepo.findById(orderId).ifPresent(order -> model.addAttribute("order",
    // order));
    // }
    // return "payMent";
    // }

    @RequestMapping("/paymentsuccess")
    public String paymentsuccess() {
        return "paymentsuccess";
    }

    @RequestMapping("/backendhome")
    public String backendhome() {
        return "backendhome";
    }

    @RequestMapping("/backendorder")
    public String backendorder() {
        return "backendorder";
    }

    @RequestMapping("/backendoperation")
    public String backendoperation() {
        return "backendoperation";
    }

    @RequestMapping("/backendcontentmanagement")
    public String backendcontentmanagement() {
        return "backendcontentmanagement";
    }

}
