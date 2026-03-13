package com.example.FinalWeb.controller;

import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.FinalWeb.entity.FavoritesEntity;
import com.example.FinalWeb.entity.JourneyPlanEntity;
import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.repo.FavoritesRepo;
import com.example.FinalWeb.repo.JourneyPlanRepo;

import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {

    @Autowired
    private FavoritesRepo favoritesRepo;

    @Autowired
    private JourneyPlanRepo journeyPlanRepo;

    @PostMapping("/toggle/{planId}")
    public ResponseEntity<?> toggleFavorite(@PathVariable Integer planId, HttpSession session) {

        MemberEntity member = (MemberEntity) session.getAttribute("loginMember");
        if (member == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(java.util.Map.of("success", false, "message", "需登入才能收藏行程唷！"));
        }

        try {
            // 🌟 修正使用新的 Repository 命名方法
            Optional<FavoritesEntity> favOpt = favoritesRepo.findByMember_MemberIdAndJourneyPlan_PlanId(member.getMemberId(), planId);
            boolean isFavorited;

            if (favOpt.isPresent()) {
                favoritesRepo.delete(favOpt.get());
                isFavorited = false;
            } else {
                // 🌟 必須先從資料庫找出這個行程的「物件」
                JourneyPlanEntity plan = journeyPlanRepo.findById(planId)
                        .orElseThrow(() -> new RuntimeException("找不到該行程"));

                FavoritesEntity newFav = new FavoritesEntity();
                newFav.setMember(member); // 🌟 放入 MemberEntity 物件
                newFav.setJourneyPlan(plan); // 🌟 放入 JourneyPlanEntity 物件
                favoritesRepo.save(newFav);
                isFavorited = true;
            }

            return ResponseEntity.ok(java.util.Map.of("success", true, "isFavorited", isFavorited));

        } catch (Exception e) {
            System.out.println(e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "message", "系統錯誤: " + e.getMessage()));
        }
    }
}
