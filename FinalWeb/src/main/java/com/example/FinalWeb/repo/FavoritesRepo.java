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

    // 1. 判斷某會員是否收藏某行程 (點擊愛心切換用)
    Optional<FavoritesEntity> findByMember_MemberIdAndJourneyPlan_PlanId(Integer memberId, Integer planId);

    // 2. 撈出某會員所有收藏的行程 ID (讓畫面愛心亮起用)
    @Query("SELECT f.journeyPlan.planId FROM FavoritesEntity f WHERE f.member.memberId = :memberId")
    List<Integer> findPlanIdsByMemberId(@Param("memberId") Integer memberId);

    // 3. 給「會員首頁」用的！撈出該會員所有的收藏實體，並依照 ID 降冪(最新收藏的在最前面)排序
    List<FavoritesEntity> findByMember_MemberIdOrderByIdDesc(Integer memberId);
}
