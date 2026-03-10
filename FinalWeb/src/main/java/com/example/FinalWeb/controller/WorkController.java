package com.example.FinalWeb.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.FinalWeb.entity.WorkDetailEntity;
import com.example.FinalWeb.service.WorkService;

@Controller
@RequestMapping("/work")
public class WorkController {

    @Autowired
    private WorkService service;

    // 測試抓 TiDB 的資料用 RestController，需要強制轉 JSON
    // @GetMapping(value = "/test", produces = "application/json")
    // public List<WorkDetailEntity> getWord() {
    // return service.getWork();
    // }

    @GetMapping("/workList")
    public String getWork(Model model) {
        List<WorkDetailEntity> workList = service.getWork();

        model.addAttribute("works", workList);

        return "workList";
    }

    @GetMapping("/workListTest")
    public String getWorkPage(Model model, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "4") int size) {
        Page<WorkDetailEntity> workPage = service.getWorkList(page,size);

        model.addAttribute("works", workPage);
        model.addAttribute("page", page);


        return "workList";
    }

}
