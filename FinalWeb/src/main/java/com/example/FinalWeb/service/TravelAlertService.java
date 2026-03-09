package com.example.FinalWeb.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import java.util.Collections;

@Service
public class TravelAlertService {
    
    private final String TRAVEL_ALERT_URL = "https://www.boca.gov.tw/sp-trwa-rss-1.xml";
    private final RestTemplate restTemplate;

    public TravelAlertService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String getTravelAlert() {
        try {
            String xmlResponse = restTemplate.getForObject(TRAVEL_ALERT_URL, String.class);
            
            XmlMapper xmlMapper = new XmlMapper();
            JsonNode node = xmlMapper.readTree(xmlResponse.getBytes());
            JsonNode items = node.get("channel").get("item");

            if (items == null) return "[]";

            // 重要修改：如果只有一筆資料，XmlMapper 會給 Object 而非 Array
            // 我們必須統一轉成 JSON 陣列字串
            ObjectMapper jsonMapper = new ObjectMapper();
            if (!items.isArray()) {
                return jsonMapper.writeValueAsString(Collections.singletonList(items));
            }
            
            return items.toString(); 
        } catch (Exception e) {
            return "[]"; 
        }
    }
}