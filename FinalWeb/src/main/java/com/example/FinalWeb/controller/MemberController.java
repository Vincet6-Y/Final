package com.example.FinalWeb.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@RequestMapping("/")
@Controller
public class MemberController {
    @RequestMapping("/test")
    public String test() {
        return "info";
    }

    @RequestMapping("/index")
    public String index() {
        return "reactTest";
    }

    @RequestMapping("/login")
    public String login() {
        return "login";
    }
}
