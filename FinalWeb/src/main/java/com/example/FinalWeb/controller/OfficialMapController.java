package com.example.FinalWeb.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.entity.MyPlanEntity;
import com.example.FinalWeb.entity.JourneyPlanEntity;
import com.example.FinalWeb.entity.MapEntity;
import com.example.FinalWeb.entity.MyMapEntity;

import com.example.FinalWeb.repo.JourneyPlanRepo;
import com.example.FinalWeb.repo.MapRepo;
import com.example.FinalWeb.repo.MyMapRepo;
import com.example.FinalWeb.repo.MyPlanRepo;

@Controller
public class OfficialMapController {

    @Autowired
    private MyPlanRepo myPlanRepo;
    @Autowired
    private MyMapRepo myMapRepo;
    @Autowired
    private JourneyPlanRepo journeyPlanRepo;
    @Autowired
    private MapRepo mapRepo;

    // 🌟 從 GlobalController 搬過來的 API Key，用來傳給地圖
    @Value("${google.maps.api-key:NONE}")
    private String googleMapsApiKey;

    // ==========================================
    // 🌟 網頁跳轉區塊 (回傳 HTML)
    // ==========================================
    @GetMapping("/officialMap")
    public String officialMapPage(@RequestParam(name = "planId", required = false) Integer planId, Model model) {
        model.addAttribute("apiKey", googleMapsApiKey);

        // 根據傳進來的 planId 去資料庫撈取行程，並放進 Model 中
        if (planId != null) {
            journeyPlanRepo.findById(planId).ifPresent(plan -> {
                model.addAttribute("plan", plan);
            });
        }
        return "officialMap";
    }

    // ==========================================
    // 🌟 背景 API 區塊 (回傳 JSON，必須加上 @ResponseBody 與 /api/plan 前綴)
    // ==========================================

    // 實作「完善規劃」按鈕點擊後的複製邏輯
    @PostMapping("/api/plan/copy/{officialPlanId}")
    @ResponseBody
    public ResponseEntity<?> copyToMyPlan(@PathVariable Integer officialPlanId, HttpSession session) {

        Object member = session.getAttribute("loginMember");
        if (member == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(java.util.Map.of("success", false, "message", "請先登入"));
        }

        try {
            JourneyPlanEntity official = journeyPlanRepo.findById(officialPlanId).orElseThrow();

            MyPlanEntity myPlan = new MyPlanEntity();
            myPlan.setJourneyPlan(official);
            myPlan.setMyPlanName(official.getPlanName() + " (我的自訂)");
            java.time.LocalDate startDate = java.time.LocalDate.now().plusDays(7);
            myPlan.setStartDate(startDate);
            myPlan.setMember((MemberEntity) member);

            myPlan = myPlanRepo.save(myPlan);

            java.time.LocalDateTime startDateTime = startDate.atTime(8, 0);
            List<MapEntity> nodes = mapRepo.findByJourneyPlan_PlanIdOrderByDayNumberAscVisitOrderAsc(officialPlanId);
            List<MyMapEntity> newMyMapNodes = new ArrayList<>();
            
            for (MapEntity n : nodes) {
                MyMapEntity myMap = new MyMapEntity();
                myMap.setMyPlan(myPlan);
                myMap.setDayNumber(n.getDayNumber());
                myMap.setVisitOrder(n.getVisitOrder());
                myMap.setLocationName(n.getLocationName());
                myMap.setLatitude(n.getLatitude());
                myMap.setLongitude(n.getLongitude());
                myMap.setGooglePlaceId(n.getGooglePlaceID());
                myMap.setVisitTime(startDateTime.plusDays(n.getDayNumber() - 1));
                myMap.setStayTime(60); 
                newMyMapNodes.add(myMap);
            }
            
            myMapRepo.saveAll(newMyMapNodes);

            return ResponseEntity.ok(java.util.Map.of("success", true, "newMyPlanId", myPlan.getMyPlanId()));

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(java.util.Map.of("success", false, "message", "複製失敗：" + e.getMessage()));
        }
    }

    // 負責把官方行程的景點資料傳給前端
    @GetMapping("/api/plan/officialPlanNodes/{planId}")
    @ResponseBody
    public ResponseEntity<?> getPlanNodes(@PathVariable Integer planId) {
        try {
            List<MapEntity> nodes = mapRepo.findByJourneyPlan_PlanIdOrderByDayNumberAscVisitOrderAsc(planId);
            return ResponseEntity.ok(nodes);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("success", false, "message", "獲取資料失敗：" + e.getMessage()));
        }
    }

    // 更新對應景點的 GooglePlaceID
    @PutMapping("/api/plan/updateNodePlaceId/{spotId}")
    @ResponseBody
    public ResponseEntity<?> updateNodePlaceId(@PathVariable Integer spotId, @RequestBody Map<String, String> body) {
        try {
            String newPlaceId = body.get("placeId");
            return mapRepo.findById(spotId).map(node -> {
                node.setGooglePlaceID(newPlaceId);
                mapRepo.save(node);
                return ResponseEntity.ok(java.util.Map.of("success", true));
            }).orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    // 負責把「會員個人行程 (MyMap)」的景點資料傳給前端
    @GetMapping("/api/plan/myPlanNodes/{myPlanId}")
    @ResponseBody
    public ResponseEntity<?> getMyPlanNodes(@PathVariable Integer myPlanId) {
        try {
            List<MyMapEntity> nodes = myMapRepo.findByMyPlan_MyPlanIdOrderByDayNumberAscVisitOrderAsc(myPlanId);
            return ResponseEntity.ok(nodes);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("success", false, "message", "獲取個人資料失敗：" + e.getMessage()));
        }
    }

    // 更新使用者自訂行程名稱
    @PutMapping("/api/plan/updateName/{myPlanId}")
    @ResponseBody
    public ResponseEntity<?> updateMyPlanName(@PathVariable Integer myPlanId, @RequestBody Map<String, String> body) {
        try {
            String newName = body.get("name");
            if (newName == null || newName.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(java.util.Map.of("success", false, "message", "名稱不可為空"));
            }
            return myPlanRepo.findById(myPlanId).map(plan -> {
                plan.setMyPlanName(newName);
                myPlanRepo.save(plan);
                return ResponseEntity.ok(java.util.Map.of("success", true, "newName", newName));
            }).orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(java.util.Map.of("success", false)));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(java.util.Map.of("success", false, "message", e.getMessage()));
        }
    }
}