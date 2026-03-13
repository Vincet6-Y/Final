package com.example.FinalWeb.repo;

import java.util.List;
import java.util.Optional;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.FinalWeb.entity.FavoritesEntity;

@Repository
public interface FavoritesRepo extends JpaRepository<FavoritesEntity, Integer> {

    // 🌟 修正 1：依照 JPA 命名規則，透過底線關聯到物件內的 ID
    Optional<FavoritesEntity> findByMember_MemberIdAndJourneyPlan_PlanId(Integer memberId, Integer planId);

    // 🌟 新增 2：自訂查詢，用來在網頁載入時判斷哪些愛心要亮起
    @Query("SELECT f.journeyPlan.planId FROM FavoritesEntity f WHERE f.member.memberId = :memberId")
    List<Integer> findPlanIdsByMemberId(@Param("memberId") Integer memberId);
}
