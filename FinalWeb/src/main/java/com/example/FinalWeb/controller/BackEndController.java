package com.example.FinalWeb.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.example.FinalWeb.dto.WorkDTO;
import com.example.FinalWeb.entity.WorkDetailEntity;
import com.example.FinalWeb.service.WorkService;

@Controller
@RequestMapping("/backend")
public class BackEndController {

    @Autowired
    private WorkService service;

    @RequestMapping("/home")
    public String backendhome() {
        return "/backend/backendhome";
    }

    @RequestMapping("/order")
    public String backendorder() {
        return "/backend/backendorder";
    }

    @RequestMapping("/operation")
    public String backendoperation() {
        return "/backend/backendoperation";
    }

    @RequestMapping("/contentmanagement")
    public String backendcontentmanagement(Model model) {
        List<WorkDetailEntity> getNew5 = service.showNew5();

        model.addAttribute("newWroks", getNew5);

        return "/backend/backendcontentmanagement";
    }

    @RequestMapping("/backendarticle")
    public String backendarticle() {
        return "/backend/backendarticle";
    }

    // 作品列表相關
    @RequestMapping("/contentmanagement/work")
    public String backendwork() {

        return "/backend/backendworkmanagement";
    }

    @PostMapping("/contentmanagement/work/add")
    public String workupload(WorkDTO wDto) {
        service.addwork(wDto);

        return "redirect:/backend/contentmanagement/work";
    }
}
