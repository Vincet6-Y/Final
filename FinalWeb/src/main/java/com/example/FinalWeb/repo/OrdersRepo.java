package com.example.FinalWeb.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.FinalWeb.entity.OrdersEntity;

@Repository
public interface OrdersRepo extends JpaRepository<OrdersEntity, Integer> {
}
