package com.example.FinalWeb.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.FinalWeb.entity.MapEntity;

@Repository
public interface MapRepo extends JpaRepository<MapEntity, Integer> {
    // 🌟 新增：透過行程 ID 找出所有景點，並照天數與順序排列
    List<MapEntity> findByJourneyPlan_PlanIdOrderByDayNumberAscVisitOrderAsc(Integer planId);
}
