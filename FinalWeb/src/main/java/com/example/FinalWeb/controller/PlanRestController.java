package com.example.FinalWeb.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.FinalWeb.entity.MapEntity;
import com.example.FinalWeb.repo.MapRepo;

@RestController
@RequestMapping("/api/plan")
public class PlanRestController {

    @Autowired
    private MapRepo mapRepo;

    // 🌟 讓前端 JS 呼叫：/api/plan/officialPlanNodes/1
    @GetMapping("/officialPlanNodes/{planId}")
    public List<MapEntity> getOfficalPlanNodes(@PathVariable Integer planId) {
        return mapRepo.findByJourneyPlan_PlanIdOrderByDayNumberAscVisitOrderAsc(planId);
    }
}
