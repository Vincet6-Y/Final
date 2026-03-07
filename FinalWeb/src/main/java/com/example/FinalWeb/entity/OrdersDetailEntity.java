package com.example.FinalWeb.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "ordersdetail")
@Data
public class OrdersDetailEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer orderDetailId;
    
    private String ticketType;
    private Integer ticketPrice;
    private Integer count;
    
    // 拉關連線到 orders
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "orderId")
    private OrdersEntity orders;
    
    // 拉關連線到 myMap
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "spotId")
    private MyMapEntity myMap;
    
}
