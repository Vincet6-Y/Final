package com.example.FinalWeb.service;

import java.util.List;

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

        // 2. 處理景點 (MapEntity)
        if (dto.getSpots() != null && !dto.getSpots().isEmpty()) {
            for (SpotDTO spotDto : dto.getSpots()) {
                MapEntity mapEntity = new MapEntity();
                mapEntity.setJourneyPlan(savedPlan); // 綁定剛剛生成的 planId
                mapEntity.setDayNumber(spotDto.getDayNumber());
                mapEntity.setVisitOrder(spotDto.getVisitOrder());
                mapEntity.setLocationName(spotDto.getLocationName());
                mapEntity.setLongitude(spotDto.getLongitude());
                mapEntity.setLatitude(spotDto.getLatitude());
                mapEntity.setGooglePlaceID(spotDto.getGooglePlaceId());

                // 存入地圖資料表
                mapRepo.save(mapEntity);
            }
        }
    }
}
