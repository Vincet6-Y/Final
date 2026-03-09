package com.example.FinalWeb.entity;

import java.time.LocalDateTime;

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
@Table(name = "orders")
@Data
public class OrdersEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer orderId;

    private Integer total;
    private String payStatus;
    private LocalDateTime orderTime;

    // 綠界相關欄位
    private String tradeNo, paymentType;
    private LocalDateTime payTime;
    
    // 拉關連線到 member
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "memberId")
    private MemberEntity member;
    
    // 拉關連線到 myPlan
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "myPlanId")
    private MyPlanEntity myPlan;

}
