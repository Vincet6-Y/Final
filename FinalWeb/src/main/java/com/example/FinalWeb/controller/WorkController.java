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
public class WorkController {

    @Autowired
    private WorkService service;

    // 首頁邏輯
    @GetMapping("/home")
    public String home(Model model) {
        System.out.println("=== 偵測到訪問首頁 ===");
        
        // 抓取資料
        List<WorkDetailEntity> featuredList = service.getWorkList(0, 4, "DESC", null).getContent();
        
        model.addAttribute("featuredList", featuredList);
        return "home";
    }

    // 列表頁邏輯
    @GetMapping("/workList")
    public String getWorkPage(Model model, 
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "4") int size,
            @RequestParam(defaultValue = "DESC") String sortDir,
            @RequestParam(required = false) String workClass) {
        Page<WorkDetailEntity> workPage = service.getWorkList(page, size, sortDir, workClass);
        model.addAttribute("works", workPage);
        return "workList";
    }

    // 詳情頁邏輯
    @GetMapping("/workListDetail")
    public String workListDetail(Model model, @RequestParam int workId) {
        WorkDetailEntity gEntity = service.getWorkId(workId);
        model.addAttribute("idNow", gEntity);
        return "workListDetail";
    }
}