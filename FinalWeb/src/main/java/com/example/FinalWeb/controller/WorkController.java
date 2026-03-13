package com.example.FinalWeb.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import com.example.FinalWeb.entity.WorkDetailEntity;
import com.example.FinalWeb.service.WorkService;

@Controller
@RequestMapping("/")
public class WorkController {

    @Autowired
    private WorkService service;

     // 首頁邏輯
    @GetMapping("/home")
    public String home(Model model) {
        System.out.println("=== 偵測到訪問首頁 ===");
        
        // 抓取資料
        List<WorkDetailEntity> featuredList = service.getWorkList(0, 4, "DESC", null, "1980", "2026").getContent();
        
        model.addAttribute("featuredList", featuredList);
        return "home";
    }

    // 測試抓 TiDB 的資料用 RestController，需要強制轉 JSON
    // @GetMapping(value = "/test", produces = "application/json")
    // public List<WorkDetailEntity> getWord() {
    // return service.getWork();
    // }

    @GetMapping("/workList")
    public String getWorkPage(Model model, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "4") int size,
            @RequestParam(defaultValue = "DESC") String sortDir,
            @RequestParam(required = false) String workClass,
            @RequestParam(defaultValue = "1980") String minYear,
            @RequestParam(defaultValue = "2026") String maxYear) {
                
        Page<WorkDetailEntity> workPage = service.getWorkList(page, size, sortDir, workClass, minYear, maxYear);

        model.addAttribute("works", workPage);
        model.addAttribute("page", page);
        model.addAttribute("sortNow", sortDir);
        model.addAttribute("classNow", workClass);
        model.addAttribute("minYearNow", minYear);
        model.addAttribute("maxYearNow", maxYear);

        return "workList";
    }

    @RequestMapping("/workListDetail")
    public String workListDetail(Model model,
            @RequestParam(value = "workId") int workId) {

        WorkDetailEntity gEntity = service.getWorkId(workId);

        model.addAttribute("idNow", gEntity);

        return "workListDetail";
    }

}