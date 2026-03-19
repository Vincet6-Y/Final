package com.example.FinalWeb.controller;

import com.example.FinalWeb.dto.ArticleDTO;
import com.example.FinalWeb.service.ArticleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.client.RestTemplate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Controller
public class WeatherController {

    @Autowired
    private ArticleService articleService;

    private final String API_BASE_URL = "https://api.open-meteo.com/v1/forecast";

    @GetMapping("/info")
    public String getInfoPage(Model model) {
        // --- 1. 處理天氣資料邏輯 ---
        String[] cities = {"札幌", "東京", "沖繩"};
        double[][] coords = {{43.06, 141.35}, {35.69, 139.69}, {26.21, 127.68}};
        
        List<Map<String, Object>> weatherDataList = new ArrayList<>();
        RestTemplate restTemplate = new RestTemplate();

        try {
            for (int i = 0; i < cities.length; i++) {
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

        // --- 2. 處理文章資料邏輯 ---
        List<ArticleDTO> travelSection = articleService.findAll().stream()
            .filter(a -> !"draft".equals(a.getStatus())) // Filter drafts
            .map(ArticleDTO::new)
            .filter(a -> "特色活動".equals(a.getArticleClass()))
            .collect(Collectors.toList());

        // 將清單反轉，讓最新的文章排在前面
        java.util.Collections.reverse(travelSection);

        // 取前 3 筆，並確保不會因為資料不足報錯
        List<ArticleDTO> limitedSection = travelSection.stream()
            .limit(3)
            .collect(Collectors.toList());

        // --- 3. 將資料放入 Model ---
        model.addAttribute("allWeather", weatherDataList); 
        model.addAttribute("travelSection", limitedSection); 
        
        return "info"; 
    } // 這裡結束 getInfoPage 方法
} // 這裡結束 WeatherController 類別