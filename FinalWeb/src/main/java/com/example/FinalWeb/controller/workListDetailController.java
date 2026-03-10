package com.example.FinalWeb.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/")
public class workListDetailController {

    @RequestMapping("/workListDetail")
    public String workListDetail() {
        return "workListDetail";
    }
}
