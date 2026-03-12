package com.example.FinalWeb.controller;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;

import org.springframework.web.bind.annotation.*;

import com.example.FinalWeb.dto.MemberLoginDTO;
import com.example.FinalWeb.dto.MemberRegisterDTO;
import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.service.MemberService;

import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/auth")
public class MemberController {

    @Autowired
    private MemberService memberService;

    // 處理登入
    @PostMapping("/login")
    public String login(MemberLoginDTO login,  HttpSession session) {

        MemberEntity member = memberService.login(login.email(), login.passwd());

        if(member == null){
            return "redirect:/auth?error";
        }

        session.setAttribute("loginMember", member);

        return "redirect:/home";
    }

    @GetMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/home";
    }

    // 處理註冊
    @PostMapping("/register")
    public String register(MemberRegisterDTO register) {

        String email = register.email();
        String passwd = register.passwd();


        return "redirect:/auth";
    }

}