package com.example.FinalWeb.controller;

import java.util.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.example.FinalWeb.entity.MyMapEntity;
import com.example.FinalWeb.entity.MyPlanEntity;
import com.example.FinalWeb.repo.MyMapRepo;
import com.example.FinalWeb.repo.MyPlanRepo;

@Controller
public class PackageTourMapController {

    @Autowired
    private MyPlanRepo myPlanRepo;

    @Autowired
    private MyMapRepo myMapRepo;

    // 🌟 從 application.properties 中讀取你的 Google Maps API Key
    @Value("${google.maps.api.key}")
    private String googleMapsApiKey;

    @RequestMapping("/packageTourMap")
    public String packageTourMap(@RequestParam(required = false) Integer myPlanId, Model model) {

        // 1. 根據傳入的 ID 抓取會員行程資料
        if (myPlanId != null) {
            MyPlanEntity myPlan = myPlanRepo.findById(myPlanId).orElse(null);

            // 🌟 這行最關鍵：將資料放入 Model，前端的 ${myPlan} 才能抓到值
            model.addAttribute("myPlan", myPlan);

            // 除錯用：可以在控制台確認是否有抓到資料
            if (myPlan != null) {
                System.out.println("成功載入行程：" + myPlan.getMyPlanName());
            } else {
                System.out.println("找不到 ID 為 " + myPlanId + " 的行程");
            }
        }

        // 2. 將金鑰存入 model，供 HTML 中的 Google Maps Script 使用
        model.addAttribute("apiKey", googleMapsApiKey);

        // 3. 回傳 packageTourMap.html 頁面
        return "packageTourMap";
    }

    // ==========================================
    // 🌟 AI 一鍵排序演算法 (最短路徑貪婪演算法)
    // ==========================================
    @PostMapping("/api/plan/aiSort")
    @ResponseBody
    public Map<String, Object> aiSortItinerary(@RequestParam Integer myPlanId, @RequestParam Integer dayNumber) {
            Map<String, Object> response = new HashMap<>();
        try {
            // 1. 抓出這天所有的景點
            List<MyMapEntity> spots = myMapRepo
                    .findByMyPlan_MyPlanIdAndDayNumberOrderByVisitOrderAsc(myPlanId, dayNumber);

            // 如果景點少於 3 個，其實不需要排 (起點跟終點而已)
            if (spots == null || spots.size() <= 2) {
                response.put("success", true);
                response.put("message", "景點過少，不需要優化");
                return response;
            }

            List<MyMapEntity> sortedSpots = new ArrayList<>();
            List<MyMapEntity> unvisited = new ArrayList<>(spots);

            // 2. 將第一個景點設為「固定起點」
            MyMapEntity current = unvisited.remove(0);
            sortedSpots.add(current);

            // 3. 不斷尋找離「目前這站」最近的「下一站」
            while (!unvisited.isEmpty()) {
                MyMapEntity nearest = null;
                double minDistance = Double.MAX_VALUE;

                for (MyMapEntity candidate : unvisited) {
                    double dist = calculateDistance(
                            current.getLatitude().doubleValue(), current.getLongitude().doubleValue(),
                            candidate.getLatitude().doubleValue(), candidate.getLongitude().doubleValue());
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearest = candidate;
                    }
                }

                // 找到最近的點後，把它加入排序完成的清單，並設為新的「目前這站」
                sortedSpots.add(nearest);
                unvisited.remove(nearest);
                current = nearest;
            }

            // 4. 更新資料庫中的 visitOrder
            for (int i = 0; i < sortedSpots.size(); i++) {
                sortedSpots.get(i).setVisitOrder(i + 1); // 順序變成 1, 2, 3...
            }
            myMapRepo.saveAll(sortedSpots);

            response.put("success", true);
            response.put("message", "排序完成");

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "排序失敗：" + e.getMessage());
        }
        return response;
    }

    // 🌟 計算兩個經緯度之間的距離 (Haversine 公式)
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // 地球半徑 (公里)
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                        * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}