package com.example.FinalWeb.controller;

import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.FinalWeb.entity.MemberEntity; // 🌟 新增引入 MemberEntity
import com.example.FinalWeb.entity.MyPlanEntity;
import com.example.FinalWeb.entity.JourneyPlanEntity;
import com.example.FinalWeb.entity.MapEntity;
import com.example.FinalWeb.entity.MyMapEntity;

import com.example.FinalWeb.repo.JourneyPlanRepo;
import com.example.FinalWeb.repo.MapRepo;
import com.example.FinalWeb.repo.MyMapRepo;
import com.example.FinalWeb.repo.MyPlanRepo;

@RestController
@RequestMapping("/api/plan")
public class PlanController {

    @Autowired
    private MyPlanRepo myPlanRepo;
    @Autowired
    private MyMapRepo myMapRepo;
    @Autowired
    private JourneyPlanRepo journeyPlanRepo;
    @Autowired
    private MapRepo mapRepo;

    // 實作「完善規劃」按鈕點擊後的複製邏輯
    @PostMapping("/copy/{officialPlanId}")
    public ResponseEntity<?> copyToMyPlan(@PathVariable Integer officialPlanId, HttpSession session) {

        // A. 檢查登入
        Object member = session.getAttribute("loginMember");
        if (member == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(java.util.Map.of("success", false, "message", "請先登入"));
        }

        try {
            // B. 撈出官方行程來源
            JourneyPlanEntity official = journeyPlanRepo.findById(officialPlanId).orElseThrow();

            // C. 建立並存入一筆新的自訂行程 (MyPlan)
            MyPlanEntity myPlan = new MyPlanEntity();
            myPlan.setJourneyPlan(official);
            myPlan.setMyPlanName(official.getPlanName() + " (我的自訂)");
            myPlan.setStartDate(java.time.LocalDate.now().plusDays(7));

            // 🌟 關鍵修正：將 Session 裡的會員物件轉型並設定給 myPlan
            myPlan.setMember((MemberEntity) member);

            myPlan = myPlanRepo.save(myPlan); // 先存，取得新的 myPlanId

            // D. 深拷貝：把官方景點 (Map) 複製到我的景點 (MyMap)
            List<MapEntity> nodes = mapRepo.findByJourneyPlan_PlanIdOrderByDayNumberAscVisitOrderAsc(officialPlanId);
            for (MapEntity n : nodes) {
                MyMapEntity myMap = new MyMapEntity();
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

    // 負責把官方行程的景點資料傳給前端
    @GetMapping("/officialPlanNodes/{planId}")
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
    @PutMapping("/updateNodePlaceId/{spotId}")
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

    // ==========================================
    // 🌟 該加上的：負責把「會員個人行程 (MyMap)」的景點資料傳給前端
    // ==========================================
    @GetMapping("/myPlanNodes/{myPlanId}")
    public ResponseEntity<?> getMyPlanNodes(@PathVariable Integer myPlanId) {
        try {
            // 從 myMapRepo 中撈出屬於這個 myPlanId 的所有景點，並依天數與順序排序
            List<MyMapEntity> nodes = myMapRepo.findByMyPlan_MyPlanIdOrderByDayNumberAscVisitOrderAsc(myPlanId);

            return ResponseEntity.ok(nodes);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("success", false, "message", "獲取個人資料失敗：" + e.getMessage()));
        }
    }

    // 更新使用者自訂行程名稱
    @PutMapping("/updateName/{myPlanId}")
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
            return ResponseEntity.internalServerError().body(java.util.Map.of("success", false, "message", e.getMessage()));
        }
    }
}