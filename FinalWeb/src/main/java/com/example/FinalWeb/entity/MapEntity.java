package com.example.FinalWeb.entity;

import java.math.BigDecimal;

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
    
    // 拉關連線到 journeyPlan
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "planId")
    private JourneyPlanEntity journeyPlan;
    
}
