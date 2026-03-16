package com.example.FinalWeb.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.FinalWeb.entity.MyMapEntity;

@Repository
public interface MyMapRepo extends JpaRepository<MyMapEntity, Integer> {

    List<MyMapEntity> findByMyPlan_MyPlanIdOrderByDayNumberAscVisitOrderAsc(Integer myPlanId);

    // 🌟 專門抓取「特定行程」中「特定天數」的景點，並依順序排列
    List<MyMapEntity> findByMyPlan_MyPlanIdAndDayNumberOrderByVisitOrderAsc(Integer myPlanId, Integer dayNumber);
}
