package com.example.FinalWeb.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.example.FinalWeb.dto.WorkDTO;
import com.example.FinalWeb.entity.JourneyPlanEntity;
import com.example.FinalWeb.entity.MapEntity;
import com.example.FinalWeb.entity.WorkDetailEntity;
import com.example.FinalWeb.repo.JourneyPlanRepo;
import com.example.FinalWeb.repo.WorkDetailRepo;

import jakarta.transaction.Transactional;

@Service
public class WorkService {

    @Autowired
    private WorkDetailRepo repo;

    @Autowired
    private JourneyPlanRepo jourepo;

    // 抓列表資料
    public List<WorkDetailEntity> getWork() {

        return repo.findAll();
    }

    public Page<WorkDetailEntity> getWorkList(int page, int size, String sortDir, String workClass, String minYear,
            String maxYear) {
        // 日期相關
        LocalDate startYear = LocalDate.parse(minYear + "-01-01");
        LocalDate endYear = LocalDate.parse(maxYear + "-12-31");

        // 排序用
        Sort.Direction direction = sortDir.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        Sort sort = Sort.by(direction, "onDate");

        // 分頁功能
        Pageable pageable = PageRequest.of(page, size, sort);

        if (workClass != null && !workClass.isEmpty()) {
            return repo.findByWorkClassAndOnDateBetween(workClass, pageable, startYear, endYear);
        } else {
            // Page<WorkDetailEntity> workPage = repo.findAll(pageable);
            return repo.findByOnDateBetween(startYear, endYear, pageable);
        }
    }

    // Detail 使用
    public WorkDetailEntity getWorkId(int workId) {
        return repo.findById(workId).orElse(null);
    }

    // Detail 下方行程用
    @Transactional
    public List<JourneyPlanEntity> getPlan(int workId) {

        List<JourneyPlanEntity> plans = jourepo.findByWorkDetail_WorkId(workId);

        // 2. 故意去摸一下每個行程的 maps，強迫管家去資料庫把景點撈出來
        for (JourneyPlanEntity plan : plans) {
            plan.getMaps().size(); // 💡 這就是「喚醒」的關鍵動作！

            // 準備一個會「自動從小排到大」的分類盒，準備裝這個行程的景點
            Map<Integer, String> dayMap = new TreeMap<>();

            // 3. 第二層迴圈：把這個行程底下的「所有散落景點」拿出來
            for (MapEntity map : plan.getMaps()) {

                Integer day = map.getDayNumber(); // 取得這是第幾天 (例如 1)
                String loc = map.getLocationName(); // 取得景點名稱 (例如 "抵達東京")

                // 🌟 核心邏輯：判斷盒子裡有沒有這天的紀錄了？
                if (dayMap.containsKey(day)) {
                    // 如果有：把原本盒子裡的字串拿出來，加上「、」，再接上新景點，放回去
                    String oldString = dayMap.get(day);
                    dayMap.put(day, oldString + "、" + loc);
                } else {
                    // 如果沒有：代表這是這天的第一個景點，直接放進去
                    dayMap.put(day, loc);
                }
            }

            // 4. 這個行程的景點都分類串好後，把整個分類盒塞進我們剛剛做的「隱形口袋」裡
            plan.setGroupedDays(dayMap);
        }

        return plans;
    }

    // 新增：根據關鍵字搜尋作品（支援分頁與排序）
    public Page<WorkDetailEntity> searchWorkList(String keyword, int page, int size, String sortDir) {
        Sort.Direction direction = sortDir.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        Sort sort = Sort.by(direction, "onDate");
        Pageable pageable = PageRequest.of(page, size, sort);

        // 呼叫 Repo 層的模糊查詢方法
        return repo.findByWorkNameContaining(keyword, pageable);
    }

    // 在 WorkService.java 新增
    public WorkDetailEntity findSingleWorkByName(String keyword) {
        // 這裡可以使用 repo 搜尋，並取結果的第一筆
        List<WorkDetailEntity> results = repo.findByWorkNameContaining(keyword, PageRequest.of(0, 1)).getContent();
        return results.isEmpty() ? null : results.get(0);
    }

    // 後台功能
    public void addwork(WorkDTO wDto) {
        WorkDetailEntity wEntity = new WorkDetailEntity();
        wEntity.setWorkName(wDto.workName());
        wEntity.setOnDate(wDto.onDate());
        wEntity.setWorkClass(wDto.workClass());
        wEntity.setWorkImg(wDto.workImg());
        wEntity.setDescription(wDto.description());
        wEntity.setDirector(wDto.director());
        wEntity.setWriter(wDto.writer());
        wEntity.setLocation(wDto.location());
        if (wDto.workClass().equals("動畫")) {
            wEntity.setEpisodes(wDto.episodes());
        }
        if (wDto.workClass().equals("電影")) {
            wEntity.setMovielength(wDto.movielength());
        }

        repo.save(wEntity);
    }
}
