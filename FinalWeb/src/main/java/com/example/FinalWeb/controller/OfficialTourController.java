package com.example.FinalWeb.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import com.example.FinalWeb.entity.JourneyPlanEntity;
import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.repo.FavoritesRepo;
import com.example.FinalWeb.repo.JourneyPlanRepo;

import jakarta.servlet.http.HttpSession;

@Controller
public class OfficialTourController {

    @Autowired
    private JourneyPlanRepo journeyPlanRepo;

    @Autowired
    private FavoritesRepo favoritesRepo;

    @GetMapping("/officialTour")
    public String officialTourPage(Model model, HttpSession session) {
        
        // 1. 撈取資料庫中所有的官方行程
        List<JourneyPlanEntity> plans = journeyPlanRepo.findByStatusTrue();
        
        // 2. 將行程清單放入 Model，就能用 ${journeyPlans} 取出
        model.addAttribute("journeyPlans", plans);

        // 3. 檢查目前是否有會員登入
        MemberEntity member = (MemberEntity) session.getAttribute("loginMember");
        
        if (member != null) {
            // 4. 如果有登入，利用剛剛在 FavoritesRepo 寫好的自訂查詢，撈出該會員「所有已收藏的行程 ID」
            List<Integer> favoriteIds = favoritesRepo.findPlanIdsByMemberId(member.getMemberId());
            
            // 5. 將收藏的 ID 清單放入 Model，前端就能透過 ${myFavoritePlanIds.contains(...)} 來判斷愛心要不要亮起
            model.addAttribute("myFavoritePlanIds", favoriteIds);
        } else {
            // 如果未登入，為了防止 Thymeleaf 報錯，我們可以傳一個空的清單或是 null (Thymeleaf null safe 會自動當作 false)
            model.addAttribute("myFavoritePlanIds", null);
        }
        
        // 6. 導向至 officialTour.html
        return "officialTour";
    }
}