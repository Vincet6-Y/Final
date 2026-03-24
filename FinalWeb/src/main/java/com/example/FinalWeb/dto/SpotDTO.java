package com.example.FinalWeb.dto;

import java.math.BigDecimal;

import lombok.Data;

@Data
public class SpotDTO {
    private Integer dayNumber;    // 第幾天
    private Integer visitOrder;   // 當天順序
    private String locationName;  // 景點名稱
    private BigDecimal longitude;     // 經度
    private BigDecimal latitude;      // 緯度
    private String googlePlaceId; // Google Place ID
    
    private Integer stayTime;
    private String visitTime; // 前端傳 "HH:mm"
    private Integer distance;
    private Integer transitTime;
    private String transitMode;
    private String locationImage;
}