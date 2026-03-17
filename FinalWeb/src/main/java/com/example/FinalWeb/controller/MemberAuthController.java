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

            // 保持註冊面板開啟
            model.addAttribute("openPanel", "register");
            model.addAttribute("registerData", register);

            // 如果這次是 LINE 第一次登入後補資料註冊，失敗時要把 LINE 預填資料再帶回畫面
            model.addAttribute("lineName", session.getAttribute("lineName"));
            model.addAttribute("lineEmail", session.getAttribute("lineEmail"));

            return "auth";
        }

        // 一般註冊成功後，若是 LINE 流程，就補建立 member_oauth
        String lineUserId = (String) session.getAttribute("lineUserId");
        if (lineUserId != null) {
            MemberEntity member = memberRepo.findByEmail(register.email()).orElse(null);

            if (member != null) {
                // 避免重複綁定同一個 LINE 帳號
                boolean alreadyLinked = memberOauthRepo
                        .findByProviderAndProviderId("LINE", lineUserId)
                        .isPresent();

                if (!alreadyLinked) {
                    MemberOauthEntity oauth = new MemberOauthEntity();
                    oauth.setMember(member);
                    oauth.setProvider("LINE");
                    oauth.setProviderId(lineUserId);
                    memberOauthRepo.save(oauth);
                }
            }

            // 清除 LINE 註冊流程暫存資料
            session.removeAttribute("lineUserId");
            session.removeAttribute("lineName");
            session.removeAttribute("lineEmail");
            session.removeAttribute("lineLoginRedirect");
            session.removeAttribute("lineLoginState");
            session.removeAttribute("lineAction");
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
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("LINE 驗證失敗"));
            return "redirect:/auth";
        }

        try {
            // 2. 取得 LINE 使用者資料
            JsonNode profile = lineLoginService.getLineProfile(code);

            String lineUserId = profile.get("userId").asText();
            String lineName = profile.get("displayName").asText();

            // LINE 有 email 就取值，沒有就留空
            String lineEmail = "";
            if (profile.has("email") && !profile.get("email").isNull()) {
                lineEmail = profile.get("email").asText();
            }

            // 3. 判斷這次是登入還是綁定
            String lineAction = (String) session.getAttribute("lineAction");

            // 用完先清掉 state
            session.removeAttribute("lineLoginState");

            // =========================
            // 綁定流程
            // =========================
            if ("link".equals(lineAction)) {

                // 必須先登入會員，才能綁定
                MemberEntity loginMember = (MemberEntity) session.getAttribute("loginMember");
                if (loginMember == null) {
                    redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("請先登入會員"));
                    session.removeAttribute("lineAction");
                    return "redirect:/auth";
                }

                // 檢查這個 LINE 帳號是否已被別的會員綁定
                MemberEntity linkedMember = lineLoginService.findLinkedMember(lineUserId);
                if (linkedMember != null) {
                    redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("此 LINE 帳號已綁定其他會員"));
                    session.removeAttribute("lineAction");
                    return "redirect:/member";
                }

                // 檢查自己是否已經綁定 LINE
                boolean alreadyBound = memberOauthRepo.existsByMember_MemberIdAndProvider(
                        loginMember.getMemberId(), "LINE");

                if (alreadyBound) {
                    redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("此會員已綁定 LINE"));
                    session.removeAttribute("lineAction");
                    return "redirect:/member";
                }

                // 建立 member_oauth 綁定資料
                MemberOauthEntity oauth = new MemberOauthEntity();
                oauth.setMember(loginMember);
                oauth.setProvider("LINE");
                oauth.setProviderId(lineUserId);
                memberOauthRepo.save(oauth);

                session.removeAttribute("lineAction");
                redirectAttr.addFlashAttribute("toast", ToastInfoDTO.success("LINE 綁定成功"));
                return "redirect:/member";
            }

            // =========================
            // 登入 / 第一次註冊流程
            // =========================

            // 先查這個 LINE 帳號是否已綁定本站會員
            MemberEntity member = lineLoginService.findLinkedMember(lineUserId);

            // 已綁定：直接登入
            if (member != null) {
                session.setAttribute("loginMember", member);
                session.removeAttribute("lineAction");

                redirectAttr.addFlashAttribute("toast", ToastInfoDTO.success("LINE 登入成功"));

                String redirectUrl = (String) session.getAttribute("lineLoginRedirect");
                session.removeAttribute("lineLoginRedirect");

                if (redirectUrl != null && !redirectUrl.isBlank()) {
                    return "redirect:" + redirectUrl;
                }

                return "redirect:/home";
            }

            // 第一次 LINE 登入：把資料暫存到 session，回註冊面板補資料
            session.setAttribute("lineUserId", lineUserId);
            session.setAttribute("lineName", lineName);
            session.setAttribute("lineEmail", lineEmail);
            session.removeAttribute("lineAction");

            model.addAttribute("openPanel", "register");
            model.addAttribute("lineName", lineName);
            model.addAttribute("lineEmail", lineEmail);
            model.addAttribute("redirect", session.getAttribute("lineLoginRedirect"));

            return "auth";

        } catch (Exception e) {
            e.printStackTrace();
            session.removeAttribute("lineAction");
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("LINE 流程失敗"));
            return "redirect:/auth";
        }
    }


    // 點擊「立即綁定 LINE」時，導向 LINE OAuth 授權頁
    @GetMapping("/line/link")
    public String lineLink(HttpSession session,
                        RedirectAttributes redirectAttr) {

        // 必須先登入會員，才能綁定 LINE
        MemberEntity loginMember = (MemberEntity) session.getAttribute("loginMember");
        if (loginMember == null) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("請先登入會員"));
            return "redirect:/auth";
        }

        String linkUrl = lineLoginService.getLineLinkUrl(session);
        return "redirect:" + linkUrl;
    }

    // 解除目前會員的 LINE 綁定
    @PostMapping("/line/unlink")
    public String lineUnlink(HttpSession session,
                            RedirectAttributes redirectAttr) {

        MemberEntity loginMember = (MemberEntity) session.getAttribute("loginMember");
        if (loginMember == null) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("請先登入會員"));
            return "redirect:/auth";
        }

        boolean lineBound = memberOauthRepo.existsByMember_MemberIdAndProvider(
                loginMember.getMemberId(), "LINE"
        );

        if (!lineBound) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("尚未綁定 LINE"));
            return "redirect:/member";
        }

        lineLoginService.unlinkLine(loginMember.getMemberId());

        redirectAttr.addFlashAttribute("toast", ToastInfoDTO.success("LINE 已解除綁定"));
        return "redirect:/member";
    }

}