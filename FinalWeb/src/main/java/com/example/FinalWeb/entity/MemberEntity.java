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

    // --------------------------------------------------
    // 一個 member 對應多個 favorites 紀錄
    @JsonIgnore
    @OneToMany(mappedBy = "member", fetch = FetchType.LAZY)
    private List<FavoritesEntity> favorites = new ArrayList<>();

    // --------------------------------------------------
    // 一個 member 對應多個 myPlan 紀錄
    @JsonIgnore
    @OneToMany(mappedBy = "member", fetch = FetchType.LAZY)
    private List<MyPlanEntity> myPlan = new ArrayList<>();

}
