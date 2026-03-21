package com.example.FinalWeb.repo;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.FinalWeb.entity.OrdersEntity;

@Repository
public interface OrdersRepo extends JpaRepository<OrdersEntity, Integer> {
    // 給綠界金流用的：用交易編號找訂單
    OrdersEntity findByTradeNo(String tradeNo);

    // 給會員系統用的：找某個會員的所有訂單
    // 思考邏輯：會員登入後查看買過的景點票券，通常希望「最新買的」排在最上面，所以加上 OrderBy(依照) OrderTime(訂單時間)
    List<OrdersEntity> findByMember_MemberIdOrderByOrderTimeDesc(Integer memberId);

    // 後台狀態過濾：根據 payStatus 查詢
    List<OrdersEntity> findByPayStatusOrderByOrderTimeDesc(String payStatus);

    Page<OrdersEntity> findByPayStatus(String payStatus, Pageable pageable);

    // 後台關鍵字搜尋：搜尋交易編號 (tradeNo)
    List<OrdersEntity> findByTradeNoContaining(String tradeNo);

    // 後台統計：待處理訂單數
    long countByPayStatus(String payStatus);

    // 找出特定行程中，已經付款成功的景點 ID (spotId) 列表
    List<OrdersEntity> findByMyPlan_MyPlanIdAndPayStatus(Integer myPlanId, String payStatus);

    // 當天後台付款訂單
    long countByPayStatusAndOrderTimeBetween(
            String payStatus,
            LocalDateTime start,
            LocalDateTime end);
}