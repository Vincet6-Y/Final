package com.example.FinalWeb.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.example.FinalWeb.repo.JourneyPlanRepo;
import com.example.FinalWeb.repo.OrdersRepo;

@RequestMapping("/")
@Controller
public class GlobalController {

    @Autowired
    private JourneyPlanRepo journeyPlanRepo;

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

    // 2. 修改原本的 packageTourMap 方法
    @RequestMapping("/packageTourMap")
    public String packageTourMap(Model model) {
        // 將金鑰存入 model，這樣前端 Thymeleaf 才能抓到
        model.addAttribute("apiKey", googleMapsApiKey);
        return "packageTourMap";
    }

    @RequestMapping("/member")
    public String member() {
        return "member";
    }

    @RequestMapping("/auth")
    public String authPage(@RequestParam(required = false) String redirect,
                            Model model) {
        model.addAttribute("redirect", redirect);
        return "auth";
    }

    // 保持路徑，已寫在ArticleWebController
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
                        java.util.Map<Integer, java.util.List<com.example.FinalWeb.entity.MyMapEntity>> groupedByDay = 
                            allMaps.stream()
                                .sorted(java.util.Comparator.comparingInt(
                                    (com.example.FinalWeb.entity.MyMapEntity m) -> m.getDayNumber() != null ? m.getDayNumber() : 0)
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
