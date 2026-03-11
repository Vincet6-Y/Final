package com.example.FinalWeb.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.example.FinalWeb.entity.MapEntity;
import com.example.FinalWeb.repo.MapRepo;

@RestController
@RequestMapping("/api/plan")
public class PlanRestController {

    @Autowired
    private MapRepo mapRepo;

    // 取得官方行程的所有節點
    @GetMapping("/officialPlanNodes/{planId}")
    public List<MapEntity> getOfficialPlanNodes(@PathVariable Integer planId) {
        // 我們需要依照天數和順序排列，請確保 MapRepo 有對應方法，或者使用 JPA 預設命名規則
        return mapRepo.findByJourneyPlan_PlanIdOrderByDayNumberAscVisitOrderAsc(planId);
    }
}