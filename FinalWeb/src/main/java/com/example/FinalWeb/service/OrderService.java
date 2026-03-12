package com.example.FinalWeb.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.entity.MyPlanEntity;
import com.example.FinalWeb.entity.OrdersDetailEntity;
import com.example.FinalWeb.entity.OrdersEntity;
import com.example.FinalWeb.repo.OrdersRepo;

@Service
public class OrderService {

    @Autowired
    private OrdersRepo ordersRepo;

    /**
     * 建立新訂單 (包含多筆票券明細)
     */
    @Transactional
    public OrdersEntity createOrder(MemberEntity member, MyPlanEntity myPlan, List<OrdersDetailEntity> ticketCart) {

        // 1. 建立一張空白的主訂單
        OrdersEntity newOrder = new OrdersEntity();

        // 2. 設定訂單基本資料
        newOrder.setMember(member);
        newOrder.setMyPlan(myPlan);
        newOrder.setPayStatus("未付款");
        newOrder.setOrderTime(LocalDateTime.now());

        // 3. 處理關聯：告訴每一張票券「你的主人是誰」
        if (ticketCart != null && !ticketCart.isEmpty()) {
            for (OrdersDetailEntity ticket : ticketCart) {
                ticket.setOrders(newOrder);
            }
        }

        // 4. 將票券明細裝進訂單中
        newOrder.setOrderDetails(ticketCart);

        // 5. 一鍵存檔 (透過 CascadeType.ALL 自動儲存明細)
        return ordersRepo.save(newOrder);
    }

    /**
     * 根據訂單 ID 尋找訂單
     */
    public OrdersEntity getOrderById(Integer orderId) {
        return ordersRepo.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("找不到該筆訂單 ID: " + orderId));
    }
}
