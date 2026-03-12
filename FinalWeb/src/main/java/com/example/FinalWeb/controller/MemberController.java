package com.example.FinalWeb.controller;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;

import org.springframework.web.bind.annotation.*;

import com.example.FinalWeb.dto.MemberLoginDTO;
import com.example.FinalWeb.dto.MemberRegisterDTO;
import com.example.FinalWeb.service.MemberService;

@Controller
@RequestMapping("/auth")
public class MemberController {

    @Autowired
    private MemberService memberService;

    // 處理登入
    @PostMapping("/login")
    public String login(MemberLoginDTO login) {

        System.out.println(login.email());
        System.out.println(login.passwd());
        boolean isSuccess = memberService.login(login.email(), login.passwd());

        if(!isSuccess){
            return "redirect:/auth?error";
        }

        return "redirect:/home";
    }

    // 處理註冊
    @PostMapping("/register")
    @ResponseBody
    public String register(MemberRegisterDTO register) {

        String email = register.email();
        String passwd = register.passwd();


        return "redirect:/auth";
    }

}