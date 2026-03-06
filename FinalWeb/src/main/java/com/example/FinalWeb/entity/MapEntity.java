package com.example.FinalWeb.entity;

import java.math.BigDecimal;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "map")
@Data
public class MapEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int spotId;
    
    private int planId;
    private int dayNumber;
    private int visitOrder;
    private String locationName;
    private BigDecimal longitude;
    private BigDecimal latitude;
    private String GooglePlaceID;
}
