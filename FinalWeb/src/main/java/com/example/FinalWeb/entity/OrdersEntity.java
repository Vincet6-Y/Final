package com.example.FinalWeb.entity;

import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.CascadeType;
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
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Entity
@Table(name = "orders")
@Data
public class OrdersEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer orderId;

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

    // 一對多關聯
    // 訂單包含多筆訂單明細
    // 儲存訂單時，能自動儲存底下的所有明細
    @OneToMany(mappedBy = "orders", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<OrdersDetailEntity> orderDetails;

}
