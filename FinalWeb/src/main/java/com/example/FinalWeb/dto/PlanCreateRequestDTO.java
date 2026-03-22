package com.example.FinalWeb.dto;

import java.util.List;
import lombok.Data;

@Data
public class PlanCreateRequestDTO {
    private Integer workId;       // 關聯的作品 ID
    private String planName;      // 行程名稱
    private String planCity;      // 主要城市
    private Integer daysCount;    // 總天數
    
    // 包含該行程所有景點的清單
    private List<SpotDTO> spots; 
}