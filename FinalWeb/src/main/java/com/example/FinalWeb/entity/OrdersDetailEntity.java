package com.example.FinalWeb.entity;

import jakarta.persistence.Column;
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

    // QR Code 驗證用的唯一 Token (UUID 格式)
    @Column(unique = true)
    private String qrToken;

    // 票券是否已使用 (掃描驗證後設為 true)
    private Boolean ticketUsed = false;

    // 拉關連線到 orders
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "orderId")
    private OrdersEntity orders;

    // 拉關連線到 myMap (加購項目可能沒有對應景點，所以 nullable)
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "spotId", nullable = true)
    private MyMapEntity myMap;

}

