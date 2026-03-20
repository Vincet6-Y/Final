package com.example.FinalWeb.repo;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.FinalWeb.entity.OrdersDetailEntity;
import com.example.FinalWeb.entity.OrdersEntity;

@Repository
public interface OrdersDetailRepo extends JpaRepository<OrdersDetailEntity, Integer> {

    // QR Code 驗證用
    Optional<OrdersDetailEntity> findByQrToken(String qrToken);

    // 查某訂單的所有票券
    List<OrdersDetailEntity> findByOrders_OrderId(Integer orderId);

    
    // 必須定義這個方法，JPA 才能根據 OrdersEntity 查出對應的明細
    List<OrdersDetailEntity> findByOrders(OrdersEntity orders);

}
