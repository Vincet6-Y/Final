package com.example.FinalWeb.service;

import com.example.FinalWeb.dto.MyMapDTO;
import com.example.FinalWeb.entity.MyMapEntity;

import org.springframework.stereotype.Service;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class MyMapService {

    /**
     * 將 Entity 轉換為前端專用的 DTO
     * 
     * @param entity        資料庫查出來的實體
     * @param ticketSpotIds 使用者已購買門票的景點 ID 列表
     * @return 處理好的 MyMapDto
     */
    public MyMapDTO convertToDto(MyMapEntity entity, List<Integer> ticketSpotIds) {
        MyMapDTO dto = new MyMapDTO();

        // 1. 塞入基本資料
        dto.setSpotId(entity.getSpotId());
        dto.setLocationName(entity.getLocationName());
        dto.setStayTime(entity.getStayTime());
        dto.setDayNumber(entity.getDayNumber());
        dto.setVisitOrder(entity.getVisitOrder());
        dto.setGooglePlaceId(entity.getGooglePlaceId());
        dto.setLatitude(entity.getLatitude() != null ? entity.getLatitude().doubleValue() : null);
        dto.setLongitude(entity.getLongitude() != null ? entity.getLongitude().doubleValue() : null);
        dto.setLocationImage(entity.getLocationImage());

        // 2. 處理行程名稱
        if (entity.getMyPlan() != null && entity.getMyPlan().getMyPlanName() != null) {
            dto.setOrderItemsName(entity.getMyPlan().getMyPlanName());
        } else {
            dto.setOrderItemsName("自訂行程");
        }

        // 3. 處理時間顯示
        if (entity.getVisitTime() != null) {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm");
            dto.setDisplayTime(entity.getVisitTime().format(formatter));
        } else {
            int hour = 8 + (entity.getVisitOrder() != null ? (entity.getVisitOrder() - 1) * 2 : 0);
            dto.setDisplayTime(String.format("%02d:00", hour));
        }

        // 4. 處理門票判斷
        boolean hasTicket = ticketSpotIds != null && ticketSpotIds.contains(entity.getSpotId());
        dto.setHasTicket(hasTicket);

        // 5. 處理交通方式與圖示 (將英文代號轉為中文與 Material Icon 名稱)
        if (entity.getTransitMode() != null) {
            switch (entity.getTransitMode()) {
                case "TRANSIT":
                    dto.setTravelModeText("大眾運輸");
                    dto.setTravelIcon("directions_subway");
                    break;
                case "FLIGHT":
                    dto.setTravelModeText("飛機航程");
                    dto.setTravelIcon("flight");
                    break;
                case "WALKING":
                    dto.setTravelModeText("步行大約");
                    dto.setTravelIcon("directions_walk");
                    break;
                default:
                    dto.setTravelModeText("車程估算");
                    dto.setTravelIcon("directions_car");
            }
        }

        // 6. 處理交通時間 (秒轉分鐘/小時)
        if (entity.getTransitTime() != null && entity.getTransitTime() > 0) {
            int transitMins = (entity.getTransitTime() + 59) / 60; // 無條件進位到分鐘
            if (transitMins >= 60) {
                int hours = transitMins / 60;
                int mins = transitMins % 60;
                dto.setDisplayTransitTime("約 " + hours + " 小時" + (mins > 0 ? " " + mins + " 分鐘" : ""));
            } else {
                dto.setDisplayTransitTime("約 " + transitMins + " 分鐘");
            }
        }

        // 7. 處理距離 (公尺轉公里)
        if (entity.getDistance() != null && entity.getDistance() > 0) {
            if (entity.getDistance() >= 1000) {
                // 大於 1000 公尺，顯示 km 並保留小數點後一位
                dto.setDisplayDistance(String.format("(%.1f km)", entity.getDistance() / 1000.0));
            } else {
                // 小於 1000 公尺，顯示 m
                dto.setDisplayDistance("(" + entity.getDistance() + " m)");
            }
        }

        return dto;
    }
}
