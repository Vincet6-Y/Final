package com.example.FinalWeb.controller;

import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/wiki") // 確保這裡對應前端呼叫的路徑
@CrossOrigin(origins = "*")
public class WikiController {

    @GetMapping("/info")
public Map<String, String> getWikiInfo(@RequestParam String title) {
    Map<String, String> result = new HashMap<>();
    try {
        // 加入 pageimages 與 pithumbsize 參數獲取主圖（寬度設為 800px）
      String url = "https://zh.wikivoyage.org/w/api.php?action=query&prop=extracts%7Cpageimages&format=json&exintro=&pithumbsize=800&variant=zh-tw&titles=" 
             + java.net.URLEncoder.encode(title, "UTF-8");
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("User-Agent", "MyTravelApp/1.0") // 避免被維基百科擋掉
                .build();
        
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        
        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(response.body());
        JsonNode pages = root.path("query").path("pages");
        
        if (pages.isObject() && pages.elements().hasNext()) {
            JsonNode page = pages.elements().next();
            
            // 抓取文字介紹
            String extract = page.path("extract").asText("暫無介紹。");
            // 抓取圖片網址
            String imageUrl = page.path("thumbnail").path("source").asText("");

            result.put("extract", extract);
            result.put("imageUrl", imageUrl);
        }
    } catch (Exception e) {
        e.printStackTrace();
        result.put("extract", "錯誤：" + e.getMessage());
    }
    return result;
}
}