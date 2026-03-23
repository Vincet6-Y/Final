package com.example.FinalWeb.service;

import java.util.List;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.FinalWeb.dto.PlanCreateRequestDTO;
import com.example.FinalWeb.dto.SpotDTO;
import com.example.FinalWeb.entity.JourneyPlanEntity;
import com.example.FinalWeb.entity.MapEntity;
import com.example.FinalWeb.entity.WorkDetailEntity;
import com.example.FinalWeb.repo.JourneyPlanRepo;
import com.example.FinalWeb.repo.MapRepo;

@Service
public class JourneyPlanService {

    @Autowired
    private JourneyPlanRepo journeyPlanRepo;

    @Autowired
    private MapRepo mapRepo;

    // 撈取最新的行程資料顯示在後台
    public List<JourneyPlanEntity> showLatestPlans() {

        return journeyPlanRepo.findAll();
    }

    // 更新行程的上下架狀態
    @Transactional // 確保資料庫交易的完整性
    public void updateStatus(Integer planId, Boolean status) {
        // 1. 先用 ID 找出該筆行程
        JourneyPlanEntity plan = journeyPlanRepo.findById(planId).orElse(null);

        if (plan != null) {
            // 2. 更新狀態
            plan.setStatus(status);
            // 3. 儲存回資料庫
            journeyPlanRepo.save(plan);
        } else {
            // 如果找不到資料，拋出例外讓 Controller 捕捉
            throw new RuntimeException("找不到指定的行程 ID: " + planId);
        }
    }

    // 批次更新行程的上下架狀態
    @Transactional
    public void batchUpdateStatus(List<Integer> planIds, Boolean status) {
        // 利用 JPA 內建的 findAllById 一次撈出所有勾選的行程
        List<JourneyPlanEntity> plans = journeyPlanRepo.findAllById(planIds);

        for (JourneyPlanEntity plan : plans) {
            plan.setStatus(status);
        }

        // 一次全部儲存
        journeyPlanRepo.saveAll(plans);
    }

    // ==========================================
    // 新增一筆行程資料
    // ==========================================
    @Transactional
    public void createNewPlan(String planName, String planCity, Integer daysCount, Integer workId) {
        JourneyPlanEntity newPlan = new JourneyPlanEntity();
        newPlan.setPlanName(planName);
        newPlan.setPlanCity(planCity);
        newPlan.setDaysCount(daysCount);
        newPlan.setStatus(false); // 預設剛建立的行程為「下架(false)」狀態

        // 處理關聯的作品 (外來鍵 workId)
        // 使用者如果有在下拉選單選擇作品，就會寫入 workId
        if (workId != null) {
            WorkDetailEntity work = new WorkDetailEntity();
            work.setWorkId(workId);
            newPlan.setWorkDetail(work);
        }

        journeyPlanRepo.save(newPlan);
    }

    @Transactional // 確保行程跟景點要嘛一起成功，要嘛一起失敗退回
    public void createNewPlanWithSpots(PlanCreateRequestDTO dto) {

        // 1. 先建立並儲存 JourneyPlanEntity
        JourneyPlanEntity newPlan = new JourneyPlanEntity();
        newPlan.setPlanName(dto.getPlanName());
        newPlan.setPlanCity(dto.getPlanCity());
        newPlan.setDaysCount(dto.getDaysCount());
        newPlan.setStatus(false); // 預設下架

        if (dto.getWorkId() != null) {
            WorkDetailEntity work = new WorkDetailEntity();
            work.setWorkId(dto.getWorkId());
            newPlan.setWorkDetail(work);
        }

        // 儲存後，newPlan 會自動獲得資料庫配發的 planId
        JourneyPlanEntity savedPlan = journeyPlanRepo.save(newPlan);

        // 寫入景點 (新增與編輯的迴圈都要改成這樣)
        if (dto.getSpots() != null && !dto.getSpots().isEmpty()) {

            // 🌟 基準日：今天 + 3天
            LocalDate baseDate = LocalDate.now().plusDays(3);

            for (SpotDTO spotDto : dto.getSpots()) {
                MapEntity mapEntity = new MapEntity();
                mapEntity.setJourneyPlan(savedPlan);
                mapEntity.setDayNumber(spotDto.getDayNumber());
                mapEntity.setVisitOrder(spotDto.getVisitOrder());
                mapEntity.setLocationName(spotDto.getLocationName());
                mapEntity.setLongitude(spotDto.getLongitude());
                mapEntity.setLatitude(spotDto.getLatitude());

                // 🌟 防呆：GooglePlaceID 絕對不能為 null
                String placeId = spotDto.getGooglePlaceId();
                mapEntity.setGooglePlaceID((placeId != null && !placeId.isEmpty()) ? placeId : "UNKNOWN_PLACE_ID");

                // 🌟 防呆：停留時間不能為 null
                mapEntity.setStayTime(spotDto.getStayTime() != null ? spotDto.getStayTime() : 60);

                // 🌟 交通防呆：距離、時間、模式不能為 null
                mapEntity.setDistance(spotDto.getDistance() != null ? spotDto.getDistance() : 0);
                mapEntity.setTransitTime(spotDto.getTransitTime() != null ? spotDto.getTransitTime() : 0);
                mapEntity.setTransitMode(spotDto.getTransitMode() != null ? spotDto.getTransitMode() : "NONE");

                // 🌟 動態處理抵達時間 (當天+3日，並加上第幾天的偏移量)
                // 例如 Day 1 就是 +3天, Day 2 就是 +4天
                LocalDate exactDate = baseDate.plusDays(spotDto.getDayNumber() - 1);

                String timeStr = (spotDto.getVisitTime() != null && !spotDto.getVisitTime().isEmpty())
                        ? spotDto.getVisitTime()
                        : "08:00";
                LocalTime time = LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("HH:mm"));

                // 組合日期與時間
                mapEntity.setVisitTime(LocalDateTime.of(exactDate, time));

                mapRepo.save(mapEntity);
            }
        }
    }

    // ==========================================
    // 1. 取得單一行程資料 (供編輯頁面渲染用)
    // ==========================================
    public JourneyPlanEntity getPlanById(Integer planId) {
        return journeyPlanRepo.findById(planId).orElse(null);
    }

    // ==========================================
    // 2. 更新行程與對應的地圖景點
    // ==========================================
    @Transactional
    public void updatePlanWithSpots(Integer planId, PlanCreateRequestDTO dto) {
        // 1. 找出原本的行程
        JourneyPlanEntity plan = journeyPlanRepo.findById(planId)
                .orElseThrow(() -> new RuntimeException("找不到指定的行程"));

        // 2. 更新基本資料
        plan.setPlanName(dto.getPlanName());
        plan.setPlanCity(dto.getPlanCity());
        plan.setDaysCount(dto.getDaysCount());

        if (dto.getWorkId() != null) {
            WorkDetailEntity work = new WorkDetailEntity();
            work.setWorkId(dto.getWorkId());
            plan.setWorkDetail(work);
        } else {
            plan.setWorkDetail(null);
        }
        journeyPlanRepo.save(plan);

        // 3. 處理景點：先刪除該行程所有舊景點，再重新寫入新景點
        // (使用你原本在 MapRepo 就寫好的方法)
        List<MapEntity> oldMaps = mapRepo.findByJourneyPlan_PlanIdOrderByDayNumberAscVisitOrderAsc(planId);
        mapRepo.deleteAll(oldMaps);

        // 4. 寫入景點 (新增與編輯的迴圈都要改成這樣)
        if (dto.getSpots() != null && !dto.getSpots().isEmpty()) {

            // 🌟 基準日：今天 + 3天
            LocalDate baseDate = LocalDate.now().plusDays(3);

            for (SpotDTO spotDto : dto.getSpots()) {
                MapEntity mapEntity = new MapEntity();
                mapEntity.setJourneyPlan(plan); // 如果是新增方法，這裡要用 savedPlan
                mapEntity.setDayNumber(spotDto.getDayNumber());
                mapEntity.setVisitOrder(spotDto.getVisitOrder());
                mapEntity.setLocationName(spotDto.getLocationName());
                mapEntity.setLongitude(spotDto.getLongitude());
                mapEntity.setLatitude(spotDto.getLatitude());

                // 🌟 防呆：GooglePlaceID 絕對不能為 null
                String placeId = spotDto.getGooglePlaceId();
                mapEntity.setGooglePlaceID((placeId != null && !placeId.isEmpty()) ? placeId : "UNKNOWN_PLACE_ID");

                // 🌟 防呆：停留時間不能為 null
                mapEntity.setStayTime(spotDto.getStayTime() != null ? spotDto.getStayTime() : 60);

                // 🌟 交通防呆：距離、時間、模式不能為 null
                mapEntity.setDistance(spotDto.getDistance() != null ? spotDto.getDistance() : 0);
                mapEntity.setTransitTime(spotDto.getTransitTime() != null ? spotDto.getTransitTime() : 0);
                mapEntity.setTransitMode(spotDto.getTransitMode() != null ? spotDto.getTransitMode() : "NONE");

                // 🌟 動態處理抵達時間 (當天+3日，並加上第幾天的偏移量)
                // 例如 Day 1 就是 +3天, Day 2 就是 +4天
                LocalDate exactDate = baseDate.plusDays(spotDto.getDayNumber() - 1);

                String timeStr = (spotDto.getVisitTime() != null && !spotDto.getVisitTime().isEmpty())
                        ? spotDto.getVisitTime()
                        : "08:00";
                LocalTime time = LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("HH:mm"));

                // 組合日期與時間
                mapEntity.setVisitTime(LocalDateTime.of(exactDate, time));

                mapRepo.save(mapEntity);
            }
        }
    }
}
