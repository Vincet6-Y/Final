package com.example.FinalWeb.repo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.FinalWeb.entity.OrdersDetailEntity;

@Repository
public interface OrdersDetailRepo extends JpaRepository<OrdersDetailEntity, Integer> {

    // 透過 QR Token 查詢票券明細 (用於掃描驗證)
    Optional<OrdersDetailEntity> findByQrToken(String qrToken);
}

