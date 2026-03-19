package com.example.FinalWeb.repo;

import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.FinalWeb.entity.OrdersEntity;

@Repository
public interface OrdersRepo extends JpaRepository<OrdersEntity, Integer> {
    // 1. 給綠界金流用的：用交易編號找訂單
    // 思考邏輯：綠界付款成功後，會發送通知給你的伺服器並附帶 TradeNo。
    OrdersEntity findByTradeNo(String tradeNo);

    // 2. 🌟 給會員系統用的：找某個會員的所有訂單 (加入時間排序)
    // 思考邏輯：會員登入後查看買過的景點票券，通常希望「最新買的」排在最上面，所以加上 OrderBy(依照) OrderTime(訂單時間)
    // Desc(降冪/由大到小)。
    List<OrdersEntity> findByMember_MemberIdOrderByOrderTimeDesc(Integer memberId);

    // 3. 🌟 後台狀態過濾：根據 payStatus 查詢
    List<OrdersEntity> findByPayStatusOrderByOrderTimeDesc(String payStatus);

    // 4. 🌟 後台關鍵字搜尋：搜尋交易編號 (tradeNo)
    List<OrdersEntity> findByTradeNoContaining(String tradeNo);

    // 5. 🌟 後台統計：待處理訂單數
    long countByPayStatus(String payStatus);

    // 6. 🌟 後台統計：今日發放憑證 (Query 中的欄位已改為 payStatus)
    @Query("SELECT o FROM OrdersEntity o LEFT JOIN FETCH o.myPlan WHERE o.member.memberId = :memberId ORDER BY o.orderTime DESC")
    List<OrdersEntity> findMemberOrdersWithPlan(@Param("memberId") Integer memberId);

    // 在 OrdersRepo.java 中修改或新增
    // 在 OrdersRepo.java 新增
    @Query("SELECT o FROM OrdersEntity o WHERE " +
            "CAST(o.orderId AS string) LIKE %:keyword% OR " +
            "o.tradeNo LIKE %:keyword% ORDER BY o.orderTime DESC")
    List<OrdersEntity> searchOrders(@Param("keyword") String keyword);

    // 🌟 新增：計算所有已付款訂單的總營收
    // 在 OrdersRepo.java 中
    @Query("SELECT SUM(od.ticketPrice) FROM OrdersEntity o JOIN o.orderDetails od WHERE o.payStatus = '已付款'")
    Long getSumOfPaidOrders();

    // 🌟 找出特定行程中，已經付款成功的景點 ID (spotId) 列表
    @Query("SELECT m.spotId FROM OrdersEntity o JOIN o.orderDetails od JOIN od.myMap m WHERE o.myPlan.myPlanId = :planId AND o.payStatus = '已付款'")
    List<Integer> findPurchasedSpotIdsByPlanId(@Param("planId") Integer planId);
}