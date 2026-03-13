package com.example.FinalWeb.controller;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.example.FinalWeb.dto.MemberLoginDTO;
import com.example.FinalWeb.dto.MemberRegisterDTO;
import com.example.FinalWeb.dto.ToastInfoDTO;
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
    public String login(MemberLoginDTO login,  
                        HttpSession session, 
                        RedirectAttributes redirectAttr) {

        MemberEntity member = memberService.login(login.email(), login.passwd());

        if(member == null){
            redirectAttr.addFlashAttribute(
                "toast",
                ToastInfoDTO.error("帳號或密碼錯誤")
            );
            return "redirect:/auth";
        }

        session.setAttribute("loginMember", member);

        redirectAttr.addFlashAttribute(
            "toast",
            ToastInfoDTO.success("登入成功，歡迎回來")
        );

        return "redirect:/home";
    }

    // 處理登出
    @GetMapping("/logout")
    public String logout(HttpSession session,
                         RedirectAttributes redirectAttr) {
        session.invalidate();
        
        redirectAttr.addFlashAttribute(
            "toast",
            ToastInfoDTO.success("已成功登出")
        );

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