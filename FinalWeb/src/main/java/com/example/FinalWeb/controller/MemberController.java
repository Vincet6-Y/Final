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
    public String login(MemberLoginDTO login,  HttpSession session, @RequestParam(required = false) String redirect) {

        MemberEntity member = memberService.login(login.email(), login.passwd());

        if(member == null){
            // 登入失敗時，把 redirect 參數帶回去，以免使用者重試登入後迷路
            String errorUrl = "/auth?error";
            if (redirect != null && !redirect.isEmpty()) {
                errorUrl += "&redirect=" + redirect;
            }
            return "redirect" + errorUrl;
        }

        session.setAttribute("loginMember", member);

        // 🌟 核心修改：如果有指定跳轉網址，就跳轉過去
        if (redirect != null && !redirect.isEmpty()) {
            return "redirect:" + redirect;
        }

        return "redirect:/home";
    }

    // 處理登出
    @GetMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/home";
    }

    // 處理註冊
    @PostMapping("/register")
    public String register(MemberRegisterDTO register) {

        String result = memberService.register(register);

        if ("註冊成功".equals(result)) {
            return "redirect:/auth?registerSuccess";
        }

        if ("Email已註冊".equals(result)) {
            return "redirect:/auth?registerError=emailExists";
        }

        if ("密碼不一致".equals(result)) {
            return "redirect:/auth?registerError=passwdNotMatch";
        }

        return "redirect:/auth";
    }

}