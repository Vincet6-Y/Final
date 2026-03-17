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
import com.example.FinalWeb.service.LineLoginService;
import com.example.FinalWeb.service.MemberService;

import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/auth")
public class MemberAuthController {

    @Autowired
    private MemberService memberService;

    @Autowired
    private LineLoginService lineLoginService;


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
            model.addAttribute("redirect", redirect);
            return "auth";
        }

        // if(member == null){
        //     // 登入失敗時，把 redirect 參數帶回去，以免使用者重試登入後迷路
        //     String errorUrl = "/auth?error";
        //     if (redirect != null && !redirect.isEmpty()) {
        //         errorUrl += "&redirect=" + redirect;
        //     }
        //     return "redirect" + errorUrl;
        // }

        session.setAttribute("loginMember", member);

        redirectAttr.addFlashAttribute("toast", ToastInfoDTO.success("登入成功，歡迎回來"));

        // 🌟 核心修改：如果有指定跳轉網址，就跳轉過去
        if (redirect != null && !redirect.isEmpty()) {
            return "redirect:" + redirect;
        }

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



    @GetMapping("/line/login")
    public String lineLogin(@RequestParam(required = false) String redirect,
                            HttpSession session) {
        String loginUrl = lineLoginService.getLineLoginUrl(session, redirect);
        return "redirect:" + loginUrl;
    }



    @GetMapping("/line/callback")
    public String lineCallback(@RequestParam String code,
                                @RequestParam String state,
                                HttpSession session,
                                RedirectAttributes redirectAttr) {

        String savedState = (String) session.getAttribute("lineLoginState");
        if (savedState == null || !savedState.equals(state)) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("LINE登入驗證失敗"));
            return "redirect:/auth";
        }

        MemberEntity member = lineLoginService.loginWithLine(code);

        if (member == null) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("LINE登入失敗"));
            return "redirect:/auth";
        }

        session.setAttribute("loginMember", member);
        redirectAttr.addFlashAttribute("toast", ToastInfoDTO.success("LINE登入成功"));

        String redirectUrl = (String) session.getAttribute("lineLoginRedirect");
        session.removeAttribute("lineLoginState");
        session.removeAttribute("lineLoginRedirect");

        if (redirectUrl != null && !redirectUrl.isBlank()) {
            return "redirect:" + redirectUrl;
        }

        return "redirect:/home";
    }
}