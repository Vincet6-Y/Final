package com.example.FinalWeb.entity;

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
@Table(name = "journeyplan")
@Data
public class JourneyPlanEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer planId;

    private Integer daysCount;
    private String planName;

    // --------------------------------------------------
    // 一個 journeyplan 可以出現在很多 favorites 紀錄中
    @JsonIgnore
    @OneToMany(mappedBy = "journeyPlan", fetch = FetchType.LAZY)
    private List<FavoritesEntity> favorites = new ArrayList<>();
    
    // --------------------------------------------------
    // 很多 journeyplan 都可以有同一個作品
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workId")
    private WorkDetailEntity workDetail;

    // --------------------------------------------------
    // 一個 journeyplan 底下會有很多景點
    @JsonIgnore
    @OneToMany(mappedBy = "journeyPlan", fetch = FetchType.LAZY)
    private List<MapEntity> map = new ArrayList<>();

    // --------------------------------------------------
    // 同一個 journeyplan 可以被很多 myPlan 引用
    @JsonIgnore
    @OneToMany(mappedBy = "journeyPlan", fetch = FetchType.LAZY)
    private List<MyPlanEntity> myPlan = new ArrayList<>();

}
