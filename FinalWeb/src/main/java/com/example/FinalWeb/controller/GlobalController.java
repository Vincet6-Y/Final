package com.example.FinalWeb.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.example.FinalWeb.repo.JourneyPlanRepo;

import jakarta.servlet.http.HttpSession;

@RequestMapping("/")
@Controller
public class GlobalController {

    @Autowired
    private JourneyPlanRepo journeyPlanRepo;


    // @Autowired
    // private JdbcTemplate jdbcTemplate;

    // @RequestMapping("/test")
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
    public String packageTour(Model model) {
        // 透過 JourneyPlanRepo 撈出所有官方行程方案，並傳給前端渲染卡片
        model.addAttribute("journeyPlans", journeyPlanRepo.findAll());
        return "packageTour";
    }

    @RequestMapping("/packageTourDetail")
    public String packageTourDetail(@RequestParam(name = "planId", required = false) Integer planId, Model model) {
        model.addAttribute("apiKey", googleMapsApiKey);

        // 🌟 根據傳進來的 planId 去資料庫撈取行程，並放進 Model 中
        if (planId != null) {
            journeyPlanRepo.findById(planId).ifPresent(plan -> {
                model.addAttribute("plan", plan);
            });
        }
        return "packageTourDetail";
    }

    @RequestMapping("/article")
    public String article() {
        return "article";
    }

    // 1. 注入 application.properties 裡設定的金鑰變數
    @Value("${google.maps.api-key:NONE}")
    private String googleMapsApiKey;

    // 已寫在 PackageTourMapController
    // @RequestMapping("/packageTourMap")
    // public String packageTourMap(Model model) {
    // // 將金鑰存入 model，這樣前端 Thymeleaf 才能抓到
    // model.addAttribute("apiKey", googleMapsApiKey);
    // return "packageTourMap";
    // }

    @RequestMapping("/member")
    public String member() {
        return "member";
    }

    @RequestMapping("/member/terms")
    public String terms() {
        return "member/terms";
    }

    @RequestMapping("/auth")
    public String authPage(@RequestParam(required = false) String redirect,
            HttpSession session, Model model) {

        model.addAttribute("redirect", redirect);

        Object socialProvider = session.getAttribute("socialProvider");
        String socialName = (String) session.getAttribute("socialName");
        String socialEmail = (String) session.getAttribute("socialEmail");

        if (socialProvider != null) {
            model.addAttribute("openPanel", "register");
            model.addAttribute("socialName", socialName);
            model.addAttribute("socialEmail", socialEmail);
        }

        System.out.println("=== authPage session ===");
        System.out.println("session id = " + session.getId());
        System.out.println("socialProvider = " + session.getAttribute("socialProvider"));
        System.out.println("socialName = " + session.getAttribute("socialName"));
        System.out.println("socialEmail = " + session.getAttribute("socialEmail"));
        return "auth";
    }

    // 已寫在NewsController
    // @RequestMapping("/news")
    // public String news() {
    // return "news";
    // }

    @RequestMapping("/info")
    public String info() {
        return "info";
    }

    @RequestMapping("/payment")
    public String payment() {
        return "payment";
    }

    // 已寫在PaymentController
    // @RequestMapping("/payment/paymentsuccess")
    // public String paymentsuccess() {
    // return "paymentsuccess";
    // }

}
