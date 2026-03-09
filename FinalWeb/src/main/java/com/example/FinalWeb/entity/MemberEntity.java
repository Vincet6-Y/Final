package com.example.FinalWeb.entity;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "member")
@Data
public class MemberEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer memberId;

    private String email;
    private String passwd;
    private String name;
    private String phone;
    private LocalDate birthday;
    private String role;

    // 有會員收藏列表，要從 member 反向查詢 favorites
    @JsonIgnore
    @OneToMany(mappedBy = "member", fetch = FetchType.LAZY)
    private List<FavoritesEntity> favorites = new ArrayList<>();

    // 有我的行程列表，要從 member 反向查詢 myplan
    @JsonIgnore
    @OneToMany(mappedBy = "member", fetch = FetchType.LAZY)
    private List<MyPlanEntity> myPlan = new ArrayList<>();

    // 會員會查詢自己的訂單紀錄，要從 member 反向查詢 orders
    @JsonIgnore
    @OneToMany(mappedBy = "member", fetch = FetchType.LAZY)
    private List<OrdersEntity> orders = new ArrayList<>();
    
}
