package com.example.FinalWeb.controller;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
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
                        @RequestParam(required = false) String redirect,
                        RedirectAttributes redirectAttr,
                        Model model) {

        MemberEntity member = memberService.login(login.email(), login.passwd());

        if (member == null) {
            // 登入失敗時，顯示錯誤訊息並保留使用者輸入的資料
            model.addAttribute("toast", ToastInfoDTO.error("帳號或密碼錯誤"));
            model.addAttribute("loginData", login);
            model.addAttribute("openPanel", "login");
            return "auth";
        }

        session.setAttribute("loginMember", member);

        redirectAttr.addFlashAttribute("toast", ToastInfoDTO.success("登入成功，歡迎回來"));

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
    public String register(MemberRegisterDTO register,
                        Model model) {

        String result = memberService.register(register);

        if ("註冊成功".equals(result)) {
            return "redirect:/auth";
        }

        if ("Email已註冊".equals(result)) {
            model.addAttribute("toast", ToastInfoDTO.error("此 Email 已註冊"));
            model.addAttribute("openPanel", "register");
            model.addAttribute("registerData", register);
            return "auth";
        }

        if ("密碼不一致".equals(result)) {
            model.addAttribute("toast", ToastInfoDTO.error("兩次輸入的密碼不一致"));
            model.addAttribute("openPanel", "register");
            model.addAttribute("registerData", register);
            return "auth";
        }

        return "auth";
    }


}