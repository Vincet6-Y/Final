package com.example.FinalWeb.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.client.RestTemplate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Controller
public class WeatherController {

    // 使用最穩定的通用預報端點
    private final String API_BASE_URL = "https://api.open-meteo.com/v1/forecast";

    @GetMapping("/info") // 對應你的 info.html 路徑
    public String getJapanWeather(Model model) {
        String[] cities = {"札幌", "東京", "沖繩"};
        double[][] coords = {{43.06, 141.35}, {35.69, 139.69}, {26.21, 127.68}};
        
        List<Map<String, Object>> weatherDataList = new ArrayList<>();
        RestTemplate restTemplate = new RestTemplate();

        try {
            for (int i = 0; i < cities.length; i++) {
                // 修正：移除 &models=jma 以避免 400 錯誤
                // 增加 weather_code 用於判斷晴雨
                String url = String.format(
                    "%s?latitude=%f&longitude=%f&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia/Tokyo",
                    API_BASE_URL, coords[i][0], coords[i][1]);
                
                @SuppressWarnings("unchecked")
                Map<String, Object> response = restTemplate.getForObject(url, Map.class);
                
                if (response != null) {
                    response.put("cityName", cities[i]);
                    weatherDataList.add(response);
                }
            }
        } catch (Exception e) {
            System.err.println("抓取天氣失敗: " + e.getMessage());
        }

        // 這裡的 key 必須與 info.html 中的 th:each="cityData : ${allWeather}" 一致
        model.addAttribute("allWeather", weatherDataList);
        
        return "info"; 
    }
}