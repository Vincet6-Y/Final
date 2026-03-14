package com.example.FinalWeb.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.FinalWeb.entity.OrdersDetailEntity;

@Repository
public interface OrdersDetailRepo extends JpaRepository<OrdersDetailEntity, Integer> {

    // QR Code 驗證用
    Optional<OrdersDetailEntity> findByQrToken(String qrToken);

    // 查某訂單的所有票券
    List<OrdersDetailEntity> findByOrders_OrderId(Integer orderId);
}
