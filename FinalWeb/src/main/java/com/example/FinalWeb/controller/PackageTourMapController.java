package com.example.FinalWeb.controller;

import java.math.BigDecimal;
import java.util.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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
    // 🌟 將 PostMapping 改為 GetMapping，通常能直接解決 403 Forbidden 問題
    @GetMapping("/api/plan/aiSort")
    @ResponseBody
    public Map<String, Object> aiSortItinerary(
            @RequestParam Integer myPlanId, @RequestParam Integer dayNumber) {
        Map<String, Object> response = new java.util.HashMap<>();
        try {
            // 抓取該天景點
            List<MyMapEntity> spots = myMapRepo.findByMyPlan_MyPlanIdAndDayNumberOrderByVisitOrderAsc(myPlanId,
                    dayNumber);

            if (spots == null || spots.size() <= 2) {
                response.put("success", true);
                response.put("message", "景點不足，無需排序");
                return response;
            }

            // --- AI 排序邏輯 (最短路徑演算法) ---
            List<MyMapEntity> unvisited = new ArrayList<>(spots);
            List<MyMapEntity> sorted = new ArrayList<>();

            MyMapEntity current = unvisited.remove(0); // 固定第一站
            sorted.add(current);

            while (!unvisited.isEmpty()) {
                MyMapEntity nearest = null;
                double minDistance = Double.MAX_VALUE;
                for (MyMapEntity candidate : unvisited) {
                    double d = calculateDistance(current.getLatitude().doubleValue(),
                            current.getLongitude().doubleValue(),
                            candidate.getLatitude().doubleValue(), candidate.getLongitude().doubleValue());
                    if (d < minDistance) {
                        minDistance = d;
                        nearest = candidate;
                    }
                }
                sorted.add(nearest);
                unvisited.remove(nearest);
                current = nearest;
            }

            // 更新排序序號
            for (int i = 0; i < sorted.size(); i++) {
                sorted.get(i).setVisitOrder(i + 1);
            }
            myMapRepo.saveAll(sorted);

            response.put("success", true);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    // 計算距離的輔助方法
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 6371;
    }

    // ==========================================
    // 🌟 新增：將畫面上剛加入的景點即時存入資料庫
    // ==========================================
    @PostMapping("/api/plan/addNode")
    @ResponseBody
    public Map<String, Object> addNode(@RequestBody Map<String, Object> payload) {
        Map<String, Object> response = new HashMap<>();
        try {
            // 解析前端傳來的資料
            Integer myPlanId = Integer.valueOf(payload.get("myPlanId").toString());
            Integer dayNumber = Integer.valueOf(payload.get("dayNumber").toString());
            String placeId = (String) payload.get("placeId");
            String name = (String) payload.get("name");
            Double lat = Double.valueOf(payload.get("lat").toString());
            Double lng = Double.valueOf(payload.get("lng").toString());

            MyPlanEntity myPlan = myPlanRepo.findById(myPlanId).orElseThrow();

            // 找出現有該天景點數量，決定這個新景點的排序數字 (接在最後面)
            List<MyMapEntity> existing = myMapRepo.findByMyPlan_MyPlanIdAndDayNumberOrderByVisitOrderAsc(myPlanId,
                    dayNumber);
            int nextOrder = existing.size() + 1;

            // 建立並儲存新景點
            MyMapEntity newSpot = new MyMapEntity();
            newSpot.setMyPlan(myPlan);
            newSpot.setDayNumber(dayNumber);
            newSpot.setVisitOrder(nextOrder);
            newSpot.setLocationName(name);
            newSpot.setGooglePlaceId(placeId);
            newSpot.setLatitude(BigDecimal.valueOf(lat));
            newSpot.setLongitude(BigDecimal.valueOf(lng));

            myMapRepo.save(newSpot);

            response.put("success", true);
            // 將資料庫產生的真實 spotId 回傳給前端
            response.put("spotId", newSpot.getSpotId());
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
        }
        return response;
    }

    // 🌟 新增：刪除特定行程節點
    @DeleteMapping("/api/plan/deleteNode/{spotId}")
    @ResponseBody
    public Map<String, Object> deleteNode(@PathVariable Integer spotId) {
        Map<String, Object> response = new HashMap<>();
        try {
            myMapRepo.deleteById(spotId);
            response.put("success", true);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "刪除失敗：" + e.getMessage());
        }
        return response;
    }

    // 🌟 新增：批次更新某一天的景點順序
    @PostMapping("/api/plan/updateOrder")
    @ResponseBody
    public Map<String, Object> updateOrder(@RequestBody List<Map<String, Integer>> nodeOrders) {
        Map<String, Object> response = new HashMap<>();
        try {
            for (Map<String, Integer> item : nodeOrders) {
                Integer spotId = item.get("spotId");
                Integer newOrder = item.get("visitOrder");
                myMapRepo.findById(spotId).ifPresent(node -> {
                    node.setVisitOrder(newOrder);
                    myMapRepo.save(node);
                });
            }
            response.put("success", true);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "順序更新失敗");
        }
        return response;
    }
}