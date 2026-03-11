package com.example.FinalWeb.controller;


import java.time.LocalDate;

import org.springframework.stereotype.Controller;

import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/auth")
public class MemberController {

    // 處理登入
    @PostMapping("/login")
    @ResponseBody
    public String login(String email, String passwd){
        return email + " / " + passwd;
    }
    // 處理註冊
    @PostMapping("/register")
    @ResponseBody
    public String register(String email, String passwd, String confirmPasswd, String name, String phone, LocalDate birthday){
        return email + " / " + passwd + " / " + confirmPasswd + " / " + name + " / " + phone + " / " + birthday;
    }

}