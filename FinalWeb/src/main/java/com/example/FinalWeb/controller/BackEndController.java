package com.example.FinalWeb.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import com.example.FinalWeb.dto.WorkDTO;
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
    public String backendcontentmanagement() {
        return "/backend/backendcontentmanagement";
    }

    @RequestMapping("/contentmanagement/backendarticle")
    public String backendarticle() {
        return "/backend/backendarticle";
    }

    @RequestMapping("/contentmanagement/work")
    public String backendwork() {
        return "/backend/backendworkmanagement";
    }

    @PostMapping("/contentmanagement/work/add")
    public String workupload(WorkDTO wDto){
        service.addwork(wDto);

        return "redirect:/backend/contentmanagement/work";
    }
}
