package com.example.FinalWeb.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
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
    
    // 拉關連線到 member
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "memberId")
    private MemberEntity member;
    
    // 拉關連線到 myPlan
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "myPlanId")
    private MyPlanEntity myPlan;

    // 顯示訂單時，要列出該訂單的所有明細
    @JsonIgnore
    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY)
    private List<OrdersDetailEntity> orderDetails = new ArrayList<>();

}
