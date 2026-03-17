package com.example.FinalWeb.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/backend")
public class BackEndController {

    @RequestMapping("/home")
    public String backendhome() {
        return "backendhome";
    }

    @RequestMapping("/order")
    public String backendorder() {
        return "backendorder";
    }

    @RequestMapping("/operation")
    public String backendoperation() {
        return "backendoperation";
    }

    @RequestMapping("/contentmanagement")
    public String backendcontentmanagement() {
        return "backendcontentmanagement";
    }

}
