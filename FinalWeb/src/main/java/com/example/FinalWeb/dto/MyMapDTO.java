package com.example.FinalWeb.dto;

import lombok.Data;

@Data
public class MyMapDTO {
    // 1. 保留前端需要的原始資料
    private Integer spotId;
    private String locationName;
    private Integer stayTime;
    private Integer dayNumber;
    private Integer visitOrder;
    private String googlePlaceId;
    private Double latitude;
    private Double longitude;

    // 2. 新增「為前端量身打造」的顯示字串 (全部預先處理好)
    private String orderItemsName; // 行程名稱 (例如："自訂行程" 或 "東京五日遊")
    private String displayTime; // 顯示時間 (例如："08:00")
    private String travelModeText; // 交通方式文字 (例如："大眾運輸")
    private String travelIcon; // 交通方式圖示 (例如："directions_subway")
    private String displayTransitTime; // 顯示交通時間 (例如："約 1 小時 20 分鐘")
    private String displayDistance; // 顯示距離 (例如："(1.5 km)")
    private boolean hasTicket; // 是否有門票 (true/false)
    private String locationImage; // 景點圖片路徑
}
