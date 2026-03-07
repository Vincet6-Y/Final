package com.example.FinalWeb.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.FinalWeb.entity.OrdersDetailEntity;

@Repository
public interface OrdersDetailRepo extends JpaRepository<OrdersDetailEntity, Integer> {
}
