package com.example.FinalWeb.entity;

import java.math.BigDecimal;
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
@Table(name = "map")
@Data
public class MapEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer spotId;

    private Integer dayNumber;
    private Integer visitOrder;
    private String locationName;
    private BigDecimal longitude;
    private BigDecimal latitude;
    private String GooglePlaceID;

    // --------------------------------------------------
    // 一個景點可以被很多訂單明細引用
    @JsonIgnore
    @OneToMany(mappedBy = "map", fetch = FetchType.LAZY)
    private List<OrdersDetailEntity> orderDetails = new ArrayList<>();
    
    // --------------------------------------------------
    // 很多景點可以出現同一個 journeyplan
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "planId")
    private JourneyPlanEntity journeyPlan;


}
