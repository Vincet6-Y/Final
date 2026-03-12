package com.example.FinalWeb.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.FinalWeb.entity.OrdersEntity;

@Repository
public interface OrdersRepo extends JpaRepository<OrdersEntity, Integer> {
    // 1. 給綠界金流用的：用交易編號找訂單
    // 思考邏輯：綠界付款成功後，會發送通知給你的伺服器並附帶 TradeNo。
    OrdersEntity findByTradeNo(String tradeNo);

    // 2. 給會員系統用的：找某個會員的所有訂單
    // 思考邏輯：會員登入後，要去「我的訂單」頁面查看買過的景點票券。
    List<OrdersEntity> findByMember_MemberId(Integer memberId);
}
