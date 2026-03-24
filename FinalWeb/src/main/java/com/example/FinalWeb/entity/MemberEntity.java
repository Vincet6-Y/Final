package com.example.FinalWeb.entity;

import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

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

    @Column(length = 500)
    private String memberImgUrl;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean deleted = false;

    // 一對多關聯
    // 會員擁有多個收藏
    @OneToMany(mappedBy = "member")
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<FavoritesEntity> favorites;

    // 會員擁有多個行程
    @OneToMany(mappedBy = "member")
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<MyPlanEntity> myPlans;

    // 會員擁有多筆訂單
    @OneToMany(mappedBy = "member")
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<OrdersEntity> orders;

    // 會員擁有多個第三方登入帳號
    @OneToMany(mappedBy = "member")
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<MemberOauthEntity> memberOauths;

}
