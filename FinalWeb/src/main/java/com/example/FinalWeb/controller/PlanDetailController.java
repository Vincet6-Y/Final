package com.example.FinalWeb.controller;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.example.FinalWeb.dto.MyMapDTO;
import com.example.FinalWeb.entity.MyMapEntity;
import com.example.FinalWeb.repo.MyMapRepo;
import com.example.FinalWeb.service.MyMapService;
import com.example.FinalWeb.service.TicketService;

@Controller
public class PlanDetailController {
        @Autowired
        private MyMapRepo myMapRepo;

        @Autowired
        private MyMapService myMapService;

        @Autowired
        private TicketService ticketService;

        @GetMapping("/plan/detail")
        public String getPlanDetail(Model model, @RequestParam Integer planId) {

                // 1. 假設你從某處取得了該使用者的門票 ID 列表
                List<Integer> ticketSpotIds = ticketService.getPurchasedSpotIds(planId);

                // 2. 從資料庫撈出原始的 Entity 列表
                List<MyMapEntity> entities = myMapRepo.findByMyPlan_MyPlanId(planId);

                // 3. 將 Entity 列表轉換為 DTO 列表
                List<MyMapDTO> dtoList = entities.stream()
                                .map(entity -> myMapService.convertToDto(entity, ticketSpotIds))
                                .collect(Collectors.toList());

                // 4. 依照 dayNumber 進行分組 (這就是你前端 groupedByDay 需要的格式)
                Map<Integer, List<MyMapDTO>> groupedByDay = dtoList.stream()
                                .sorted(Comparator.comparingInt(
                                                (MyMapDTO m) -> m.getDayNumber() != null ? m.getDayNumber() : 1)
                                                .thenComparingInt(
                                                                m -> m.getVisitOrder() != null ? m.getVisitOrder() : 0))
                                .collect(Collectors.groupingBy(
                                                m -> m.getDayNumber() != null ? m.getDayNumber() : 1,
                                                TreeMap::new,
                                                Collectors.toList()));

                // 5. 把最終乾淨的資料塞給前端
                model.addAttribute("groupedByDay", groupedByDay);
                // ... 加入其他 model 屬性 ...

                return "plandetail"; // 對應你的 HTML 檔名
        }

}
