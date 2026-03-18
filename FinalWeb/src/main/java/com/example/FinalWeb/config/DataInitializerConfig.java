package com.example.FinalWeb.config;

import java.math.BigDecimal;
import java.time.LocalDate;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.example.FinalWeb.entity.JourneyPlanEntity;
import com.example.FinalWeb.entity.MapEntity;
import com.example.FinalWeb.entity.WorkDetailEntity;
import com.example.FinalWeb.repo.JourneyPlanRepo;
import com.example.FinalWeb.repo.MapRepo;
import com.example.FinalWeb.repo.WorkDetailRepo;

@Component
public class DataInitializerConfig implements CommandLineRunner {

    @Autowired private WorkDetailRepo workDetailRepo;
    @Autowired private JourneyPlanRepo journeyPlanRepo;
    @Autowired private MapRepo mapRepo;

    @Override
    public void run(String... args) throws Exception {
        // 🌟 核心修正：改為檢查「行程表」是否為空，這樣就不會被組員的作品表給擋住
        if (journeyPlanRepo.count() == 0) {
            System.out.println("🌱 正在初始化官方行程資料（自動引用現有作品，不重複建立）...");

            // 1. 使用 getOrCreate 邏輯，如果作品已存在就引用，不存在才建立
            WorkDetailEntity work1 = getOrCreateWork("你的名字", "東京", "2016-08-26", "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80");
            WorkDetailEntity work2 = getOrCreateWork("灌籃高手", "神奈川", "1993-10-16", "https://images.unsplash.com/photo-1580467337769-a39272323c0a?q=80");
            WorkDetailEntity work3 = getOrCreateWork("名偵探柯南", "大阪", "1996-01-08", "https://images.unsplash.com/photo-1590559899731-a382839e5549?q=80");

            // 2. 建立官方行程方案 (JourneyPlan)
            JourneyPlanEntity plan1 = new JourneyPlanEntity();
            plan1.setPlanName("你的名字 - 聖地巡禮路線");
            plan1.setPlanCity("東京"); // 🌟 直接在這裡設定城市
            plan1.setDaysCount(5);
            plan1.setWorkDetail(work1);
            journeyPlanRepo.save(plan1);

            JourneyPlanEntity plan2 = new JourneyPlanEntity();
            plan2.setPlanName("湘南海岸熱血之旅");
            plan2.setPlanCity("神奈川");
            plan2.setDaysCount(3);
            plan2.setWorkDetail(work2);
            journeyPlanRepo.save(plan2);

            JourneyPlanEntity plan3 = new JourneyPlanEntity();
            plan3.setPlanName("大阪柯南迷偵探步道");
            plan3.setPlanCity("大阪");
            plan3.setDaysCount(2);
            plan3.setWorkDetail(work3);
            journeyPlanRepo.save(plan3);

            // 3. 建立地圖節點 (讓行程有路線可以畫)
            // 這裡傳入 plan1, plan3 物件作為參數
            createMapNode(plan1, 1, 1, "須賀神社", "35.6853", "139.7222", "ChIJ7-R-8T2MGGARg0vY1UInp4U");
            createMapNode(plan1, 1, 2, "信濃町站", "35.6801", "139.7203", "ChIJt61j_zeMGGARyA2f3lBly8E");
            createMapNode(plan3, 1, 1, "通天閣", "34.6525", "135.5063", "ChIJ_5iE-M7mAGAR_GkUon9l-8Q");

            System.out.println("✅ 資料初始化成功！");
        } else {
            System.out.println("ℹ️ 行程表已有資料，略過初始化。");
        }
    }

    // 🌟 輔助方法 A：取得或建立作品 (防止重複作品出現)
    private WorkDetailEntity getOrCreateWork(String name, String city, String date, String img) {
        // 先去資料庫找有沒有同名的作品
        return workDetailRepo.findAll().stream()
                .filter(w -> w.getWorkName().equals(name))
                .findFirst()
                .orElseGet(() -> {
                    // 找不到才建立新的
                    WorkDetailEntity w = new WorkDetailEntity();
                    w.setWorkName(name);
                    w.setWorkClass(city);
                    w.setOnDate(LocalDate.parse(date));
                    w.setWorkImg(img);
                    return workDetailRepo.save(w);
                });
    }

    // 🌟 輔助方法 B：快速建立地圖節點
    private void createMapNode(JourneyPlanEntity plan, int day, int order, String name, String lat, String lng, String pid) {
        MapEntity m = new MapEntity();
        m.setJourneyPlan(plan);
        m.setDayNumber(day);
        m.setVisitOrder(order);
        m.setLocationName(name);
        m.setLatitude(new BigDecimal(lat));
        m.setLongitude(new BigDecimal(lng));
        m.setGooglePlaceID(pid);
        mapRepo.save(m);
    }
}