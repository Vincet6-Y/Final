package com.example.FinalWeb.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.example.FinalWeb.dto.ToastInfoDTO;

import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/member")
public class MemberCenterController {

    // 處理登出
    @GetMapping("/logout")
    public String logout(HttpSession session,
                         RedirectAttributes redirectAttr) {

        session.invalidate();

        redirectAttr.addFlashAttribute("toast", ToastInfoDTO.success("已成功登出"));

        return "redirect:/home";
    }

    
    @GetMapping("/profile")
    public String memberProfile() {
        return "memberProfile";
    }


}
