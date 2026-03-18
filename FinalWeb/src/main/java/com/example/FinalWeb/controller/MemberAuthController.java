package com.example.FinalWeb.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

import com.example.FinalWeb.dto.MemberLoginDTO;
import com.example.FinalWeb.dto.MemberRegisterDTO;
import com.example.FinalWeb.dto.ToastInfoDTO;
import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.entity.MemberOauthEntity;
import com.example.FinalWeb.repo.MemberOauthRepo;
import com.example.FinalWeb.repo.MemberRepo;
import com.example.FinalWeb.service.LineLoginService;
import com.example.FinalWeb.service.MemberService;
import com.fasterxml.jackson.databind.JsonNode;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/auth")
public class MemberAuthController {

    @Autowired
    private MemberService memberService;

    @Autowired
    private LineLoginService lineLoginService;

    @Autowired
    private MemberRepo memberRepo;

    @Autowired
    private MemberOauthRepo memberOauthRepo;


    // 處理登入
    @PostMapping("/login")
    public String login(MemberLoginDTO login,
            HttpSession session,
            @RequestParam(required = false) String redirect,
            RedirectAttributes redirectAttr,
            Model model,
            HttpServletRequest request) {

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
        // // 登入失敗時，把 redirect 參數帶回去，以免使用者重試登入後迷路
        // String errorUrl = "/auth?error";
        // if (redirect != null && !redirect.isEmpty()) {
        // errorUrl += "&redirect=" + redirect;
        // }
        // return "redirect" + errorUrl;
        // }

        // 1. 準備權限清單 (資料庫已是 ROLE_ADMIN，直接取用)
        List<GrantedAuthority> authorities = AuthorityUtils.createAuthorityList(member.getRole());

        // 2. 建立一個官方認可的身份憑證 (Authentication)
        Authentication auth = new UsernamePasswordAuthenticationToken(member.getEmail(), null, authorities);

        // 3. 正式把這張憑證塞進 Spring Security 的核心口袋 (SecurityContext)
        SecurityContextHolder.getContext().setAuthentication(auth);

        // 4. 將狀態綁定到 Session 中 (最關鍵的一步！)
        session = request.getSession(true);

        // 這是你原本存放使用者資料的地方，保留著完全沒問題，方便你前端畫面使用
        session.setAttribute("loginMember", member);

        // 🌟 新增這行：把安管中心的安全狀態，用 Spring Security 指定的專屬名稱存進 Session 裡！
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                SecurityContextHolder.getContext());

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
                        HttpSession session,
                        Model model) {

        String result = memberService.register(register);

        if (!"註冊成功".equals(result)) {
            if ("Email已註冊".equals(result)) {
                model.addAttribute("toast", ToastInfoDTO.error("此 Email 已註冊"));
            } else if ("密碼不一致".equals(result)) {
                model.addAttribute("toast", ToastInfoDTO.error("兩次輸入的密碼不一致"));
            }

            model.addAttribute("openPanel", "register");
            model.addAttribute("registerData", register);
            return "auth";
        }

        // 一般註冊成功後，若是 LINE 流程，就補建立 member_oauth
        String lineUserId = (String) session.getAttribute("lineUserId");
        if (lineUserId != null) {
            MemberEntity member = memberRepo.findByEmail(register.email()).orElse(null);

            if (member != null) {
                MemberOauthEntity oauth = new MemberOauthEntity();
                oauth.setMember(member);
                oauth.setProvider("LINE");
                oauth.setProviderId(lineUserId);
                memberOauthRepo.save(oauth);
            }

            session.removeAttribute("lineUserId");
            session.removeAttribute("lineName");
            session.removeAttribute("lineLoginRedirect");
            session.removeAttribute("lineLoginState");
        }
        return "redirect:/auth";
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
                            RedirectAttributes redirectAttr,
                            Model model) {

        // 1. 驗證 state，避免 CSRF
        String savedState = (String) session.getAttribute("lineLoginState");
        if (savedState == null || !savedState.equals(state)) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("LINE登入驗證失敗"));
            return "redirect:/auth";
        }

        try {
            // 2. 取得 LINE 使用者資料
            JsonNode profile = lineLoginService.getLineProfile(code);

            String lineUserId = profile.get("userId").asText();
            String lineName = profile.get("displayName").asText();

            // LINE 有 email 就取值，沒有就給空字串
            String lineEmail = "";
            if (profile.has("email") && !profile.get("email").isNull()) {
                lineEmail = profile.get("email").asText();
            }

            // 3. 先查這個 LINE 帳號是否已綁定本站會員
            MemberEntity member = lineLoginService.findLinkedMember(lineUserId);

            // state 用完就先清掉
            session.removeAttribute("lineLoginState");

            // 4. 已綁定：直接登入
            if (member != null) {
                session.setAttribute("loginMember", member);
                redirectAttr.addFlashAttribute("toast", ToastInfoDTO.success("LINE登入成功"));

                String redirectUrl = (String) session.getAttribute("lineLoginRedirect");
                session.removeAttribute("lineLoginRedirect");

                if (redirectUrl != null && !redirectUrl.isBlank()) {
                    return "redirect:" + redirectUrl;
                }

                return "redirect:/home";
            }

            // 5. 第一次 LINE 登入：把 LINE 資料暫存到 session
            //    之後回同一個 auth 頁，直接打開 register 面板
            session.setAttribute("lineUserId", lineUserId);
            session.setAttribute("lineName", lineName);
            session.setAttribute("lineEmail", lineEmail);

            // 6. 把註冊面板打開，並預填名稱 / email
            model.addAttribute("openPanel", "register");
            model.addAttribute("lineName", lineName);
            model.addAttribute("lineEmail", lineEmail);
            model.addAttribute("redirect", session.getAttribute("lineLoginRedirect"));

            return "auth";

        } catch (Exception e) {
            e.printStackTrace();
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("LINE登入失敗"));
            return "redirect:/auth";
        }
    }
}