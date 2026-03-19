package com.example.FinalWeb.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.FinalWeb.entity.MyMapEntity;

@Repository
public interface MyMapRepo extends JpaRepository<MyMapEntity, Integer> {

    List<MyMapEntity> findByMyPlan_MyPlanIdOrderByDayNumberAscVisitOrderAsc(Integer myPlanId);

    // 🌟 AI 排序運作
    List<MyMapEntity> findByMyPlan_MyPlanIdAndDayNumberOrderByVisitOrderAsc(Integer myPlanId, Integer dayNumber);

    List<MyMapEntity> findByMyPlan_MyPlanId(Integer planId);
}
