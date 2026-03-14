package com.example.FinalWeb.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.example.FinalWeb.entity.MyPlanEntity;
import com.example.FinalWeb.repo.MyPlanRepo;

@Controller
public class PackageTourMapController {

    @Autowired
    private MyPlanRepo myPlanRepo;

    // 🌟 從 application.properties 中讀取你的 Google Maps API Key
    @Value("${google.maps.api.key}") 
    private String googleMapsApiKey;

    @RequestMapping("/packageTourMap")
    public String packageTourMap(@RequestParam(required = false) Integer myPlanId, Model model) {
        
        // 1. 根據傳入的 ID 抓取會員行程資料
        if (myPlanId != null) {
            MyPlanEntity myPlan = myPlanRepo.findById(myPlanId).orElse(null);
            
            // 🌟 這行最關鍵：將資料放入 Model，前端的 ${myPlan} 才能抓到值
            model.addAttribute("myPlan", myPlan); 
            
            // 除錯用：可以在控制台確認是否有抓到資料
            if (myPlan != null) {
                System.out.println("成功載入行程：" + myPlan.getMyPlanName());
            } else {
                System.out.println("找不到 ID 為 " + myPlanId + " 的行程");
            }
        }

        // 2. 將金鑰存入 model，供 HTML 中的 Google Maps Script 使用
        model.addAttribute("apiKey", googleMapsApiKey);
        
        // 3. 回傳 packageTourMap.html 頁面
        return "packageTourMap";
    }
}