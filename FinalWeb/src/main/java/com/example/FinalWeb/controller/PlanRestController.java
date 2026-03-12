package com.example.FinalWeb.controller;

import java.util.List;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.FinalWeb.repo.JourneyPlanRepo;
import com.example.FinalWeb.repo.MapRepo;
import com.example.FinalWeb.repo.MyMapRepo;
import com.example.FinalWeb.repo.MyPlanRepo;

@RestController
@RequestMapping("/api/plan")
public class PlanRestController {

    // 1. 請確保有 @Autowired 以下 Repo
    @Autowired
    private MyPlanRepo myPlanRepo;
    @Autowired
    private MyMapRepo myMapRepo;
    @Autowired
    private JourneyPlanRepo journeyPlanRepo;
    @Autowired
    private MapRepo mapRepo;

    // 2. 實作「完善規劃」按鈕點擊後的複製邏輯
    @PostMapping("/copy/{officialPlanId}")
    public ResponseEntity<?> copyToMyPlan(@PathVariable Integer officialPlanId,
            HttpSession session) {

        // A. 檢查登入 (這行非常重要，未登入前端會接到 401 狀態碼)
        // 🌟替換成組員實際在 LoginController 存入 session 的 key
        Object member = session.getAttribute("loginMember");
        if (member == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(java.util.Map.of("success", false, "message", "請先登入"));
        }

        try {
            // B. 撈出官方行程來源
            com.example.FinalWeb.entity.JourneyPlanEntity official = journeyPlanRepo.findById(officialPlanId)
                    .orElseThrow();

            // C. 建立並存入一筆新的自訂行程 (MyPlan)
            com.example.FinalWeb.entity.MyPlanEntity myPlan = new com.example.FinalWeb.entity.MyPlanEntity();
            myPlan.setJourneyPlan(official);
            myPlan.setMyPlanName(official.getPlanName() + " (我的自訂)");
            myPlan.setStartDate(java.time.LocalDate.now().plusDays(7));
            // myPlan.setMember((MemberEntity)member); // 🌟 這裡記得與組員確認 session 存的是不是 member
            // 物件

            myPlan = myPlanRepo.save(myPlan); // 先存，取得新的 myPlanId

            // D. 深拷貝：把官方景點 (Map) 複製到我的景點 (MyMap)
            List<com.example.FinalWeb.entity.MapEntity> nodes = mapRepo
                    .findByJourneyPlan_PlanIdOrderByDayNumberAscVisitOrderAsc(officialPlanId);
            for (com.example.FinalWeb.entity.MapEntity n : nodes) {
                com.example.FinalWeb.entity.MyMapEntity myMap = new com.example.FinalWeb.entity.MyMapEntity();
                myMap.setMyPlan(myPlan); // 關聯到剛剛新產生的 myPlanId
                myMap.setDayNumber(n.getDayNumber());
                myMap.setVisitOrder(n.getVisitOrder());
                myMap.setLocationName(n.getLocationName());
                myMap.setLatitude(n.getLatitude());
                myMap.setLongitude(n.getLongitude());
                myMap.setGooglePlaceId(n.getGooglePlaceID());
                myMapRepo.save(myMap);
            }

            // E. 成功！回傳新的 ID 給前端跳轉
            return ResponseEntity.ok(java.util.Map.of("success", true, "newMyPlanId", myPlan.getMyPlanId()));

        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(java.util.Map.of("success", false, "message", "複製失敗：" + e.getMessage()));
        }
    }

    // 🌟 新增這段：負責把官方行程的景點資料傳給前端
    @GetMapping("/officialPlanNodes/{planId}")
    public ResponseEntity<?> getPlanNodes(@PathVariable Integer planId) {
        try {
            // 利用你原本在 copy 方法裡寫好的查詢邏輯，撈出這個 planId 底下的所有景點，並照天數和順序排好
            List<com.example.FinalWeb.entity.MapEntity> nodes = mapRepo
                    .findByJourneyPlan_PlanIdOrderByDayNumberAscVisitOrderAsc(planId);

            // 直接把抓到的景點陣列轉成 JSON 回傳給前端
            return ResponseEntity.ok(nodes);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("success", false, "message", "獲取資料失敗：" + e.getMessage()));
        }
    }

    // 會根據 spotId 來更新對應景點的 GooglePlaceID
    @PutMapping("/updateNodePlaceId/{spotId}")
    public ResponseEntity<?> updateNodePlaceId(@PathVariable Integer spotId,
            @RequestBody java.util.Map<String, String> body) {
        try {
            String newPlaceId = body.get("placeId");
            return mapRepo.findById(spotId).map(node -> {
                node.setGooglePlaceID(newPlaceId); // 這裡名稱請對應你的 Entity 欄位
                mapRepo.save(node);
                return ResponseEntity.ok(java.util.Map.of("success", true));
            }).orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

}