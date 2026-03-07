package com.example.FinalWeb.controller;

import com.example.FinalWeb.dto.TravelAlert;
import com.example.FinalWeb.service.TravelAlertService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature; // 確保有這行
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/travel")
public class JapanTravelController {

    private final TravelAlertService travelAlertService;

    public JapanTravelController(TravelAlertService travelAlertService) {
        this.travelAlertService = travelAlertService;
    }

    @GetMapping("/japan")
    public List<TravelAlert> getJapanAlerts() {
        try {
            // 1. 取得原始資料
            // 呼叫 Service 中正確的方法名稱 getTravelAlert()
            String jsonData = travelAlertService.getTravelAlert(); 

            // 2. 使用 ObjectMapper 解析 JSON
            ObjectMapper objectMapper = new ObjectMapper();
            
            // 關鍵：設定忽略 JSON 中有但 TravelAlert 類別中沒有的欄位 (如 "link")
            objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

            // 將 JSON 陣列轉換為 List<TravelAlert>
            List<TravelAlert> allAlerts = objectMapper.readValue(jsonData, 
                new TypeReference<List<TravelAlert>>(){});

            // 3. 篩選包含「日本」關鍵字的資料
            return allAlerts.stream()
                .filter(alert -> alert.getTitle() != null && alert.getTitle().contains("日本"))
                .collect(Collectors.toList()); 

        } catch (Exception e) {
            System.err.println("解析失敗：" + e.getMessage());
            e.printStackTrace();
            // 發生錯誤回傳空陣列，前端 JavaScript 的 data.forEach 就不會崩潰
            return new ArrayList<>(); 
        }
    }
}