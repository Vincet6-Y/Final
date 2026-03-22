package com.example.FinalWeb.controller;

import java.util.List;
import java.util.Map;

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

import com.example.FinalWeb.dto.*;
import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.enums.AuthProvider;
import com.example.FinalWeb.repo.MemberRepo;
import com.example.FinalWeb.service.GoogleLoginService;
import com.example.FinalWeb.service.LineLoginService;
import com.example.FinalWeb.service.MemberService;
import com.example.FinalWeb.service.SocialAuthService;
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
    private GoogleLoginService googleLoginService;

    @Autowired
    private SocialAuthService socialAuthService;

    @Autowired
    private MemberRepo memberRepo;

    // ==================== 一般登入 / 註冊 ====================
    // 處理登入
    @PostMapping("/login")
    public String login(MemberLoginDTO login, HttpSession session, 
                  @RequestParam(required = false) String redirect,
                  RedirectAttributes redirectAttr, Model model, HttpServletRequest request) {

        MemberEntity member = memberService.login(login.email(), login.passwd());

        if (member == null) {
            // 登入失敗時，顯示錯誤訊息並保留使用者輸入的資料
            model.addAttribute("toast", ToastInfoDTO.error("帳號或密碼錯誤"));
            model.addAttribute("loginData", login);
            model.addAttribute("openPanel", "login");
            model.addAttribute("redirect", redirect);
            return "auth";
        }

        saveLoginSession(member, request);
        redirectAttr.addFlashAttribute("toast", ToastInfoDTO.success("登入成功，歡迎回來"));

        return redirectOrHome(redirect);
    }

    // 處理註冊
    @PostMapping("/register")
    public String register(MemberRegisterDTO register, HttpSession session, Model model,
                           HttpServletRequest request) {

        String result = memberService.register(register);

        if (!"註冊成功".equals(result)) {
            model.addAttribute("toast", resolveRegisterError(result));
            model.addAttribute("openPanel", "register");
            model.addAttribute("registerData", register);
            model.addAttribute("socialName", session.getAttribute("socialName"));
            model.addAttribute("socialEmail", session.getAttribute("socialEmail"));
            return "auth";
        }
 
        // 若是從第三方登入流程過來，補綁 OAuth
        linkPendingSocialOauth(register.email(), session, request);
 
        return "redirect:/home";
    }

    // ==================== Google ====================

    @PostMapping("/google/login")
    @ResponseBody
    public Map<String, Object> googleLogin(@RequestBody GoogleLoginRequestDTO req,
                                           HttpSession session, HttpServletRequest request) {

        try {
            SocialProfileDTO profile = googleLoginService.verifyGoogleIdToken(req.idToken());
            MemberEntity member = socialAuthService.
                                  findMemberByOauth(AuthProvider.GOOGLE, profile.providerId());
 
            if (member != null) {
                saveLoginSession(member, request);
                return Map.of("success", true, "redirectUrl", consumeSocialRedirect(session, "/home"));
            }

            // 未綁定 → 暫存資料，導到註冊頁補資料
            storePendingSocial(session, AuthProvider.GOOGLE, profile);
            return Map.of("success", true, "redirectUrl", "/auth");

        } catch (Exception e) {
            e.printStackTrace();
            return Map.of("success", false, "message", "Google 登入失敗");
        }
    }

    @PostMapping("/google/unlink")
    @ResponseBody
    public Map<String, Object> unlinkGoogle(HttpSession session) {

        MemberEntity loginMember = getLoginMember(session);

        if (loginMember == null) {
            return Map.of("success", false, "message", "請先登入");
        }
 
        if (loginMember.getPasswd() == null || loginMember.getPasswd().isBlank()) {
            return Map.of("success", false, "message", "請先設定密碼後再解除 Google 綁定");
        }
 
        try {
            socialAuthService.unlink(loginMember.getMemberId(), AuthProvider.GOOGLE);
            return Map.of("success", true, "message", "已解除 Google 綁定");
 
        } catch (IllegalStateException e) {
            return Map.of("success", false, "message", e.getMessage());
        }
    }

    @PostMapping("/google/link")
    @ResponseBody
    public Map<String, Object> googleLink(@RequestBody GoogleLoginRequestDTO req,
                                          HttpSession session) {
        
        MemberEntity loginMember = getLoginMember(session);
        if (loginMember == null) {
            return Map.of("success", false, "message", "請先登入會員");
        }
        try {
            SocialProfileDTO profile = googleLoginService.verifyGoogleIdToken(req.idToken());
            socialAuthService.link(loginMember, AuthProvider.GOOGLE, profile.providerId());
            return Map.of("success", true, "message", "Google 綁定成功");
 
        } catch (IllegalStateException e) {
            return Map.of("success", false, "message", e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return Map.of("success", false, "message", "Google 綁定失敗");
        }
    }

    // ==================== LINE ====================

    @GetMapping("/line/login")
    public String lineLogin(@RequestParam(required = false) String redirect, HttpSession session) {
        return "redirect:" + lineLoginService.getLineLoginUrl(session, redirect);
    }



    @GetMapping("/line/callback")
    public String lineCallback(@RequestParam String code, @RequestParam String state, 
                                HttpSession session, RedirectAttributes redirectAttr, 
                                Model model, HttpServletRequest request) {

        if (!isValidLineState(session, state)) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("LINE 驗證失敗"));
            return "redirect:/auth";
        }

        try {
            SocialProfileDTO profile = getLineProfile(code);
            String lineAction = (String) session.getAttribute("lineAction");
            session.removeAttribute("lineLoginState");

            if ("link".equals(lineAction)) {
                return handleLineLink(profile.providerId(), session, redirectAttr);
            }

            return socialQuickLogin(AuthProvider.LINE, profile, session, redirectAttr, model, request);

        } catch (Exception e) {
            e.printStackTrace();
            session.removeAttribute("lineAction");
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("LINE 流程失敗"));
            return "redirect:/auth";
        }
    }


    // 點擊「立即綁定 LINE」時，導向 LINE OAuth 授權頁
    @GetMapping("/line/link")
    public String lineLink(HttpSession session, RedirectAttributes redirectAttr) {

        if (getLoginMember(session) == null) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("請先登入會員"));
            return "redirect:/auth";
        }
 
        return "redirect:" + lineLoginService.getLineLinkUrl(session);
    }

    // 解除目前會員的 LINE 綁定
    @PostMapping("/line/unlink")
    public String lineUnlink(HttpSession session, RedirectAttributes redirectAttr) {

        MemberEntity loginMember = getLoginMember(session);
        if (loginMember == null) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("請先登入會員"));
            return "redirect:/auth";
        }

        try {
            socialAuthService.unlink(loginMember.getMemberId(), AuthProvider.LINE);
            lineLoginService.unlinkLine(loginMember.getMemberId());
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.success("LINE 已解除綁定"));
        } catch (IllegalStateException e) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error(e.getMessage()));
        }
 
        return "redirect:/member";
    }



    // ==================== 以下是 helper 方法 ====================

    // 建立登入後的 Session 與 Spring Security 驗證資訊
    private void saveLoginSession(MemberEntity member, HttpServletRequest request) {

        // 1. 準備權限清單 (資料庫已是 ROLE_ADMIN，直接取用)
        List<GrantedAuthority> authorities = AuthorityUtils.createAuthorityList(member.getRole());

        // 2. 建立一個官方認可的身份憑證 (Authentication)
        Authentication auth = new UsernamePasswordAuthenticationToken(member.getEmail(), null, authorities);

        // 3. 正式把這張憑證塞進 Spring Security 的核心口袋 (SecurityContext)
        SecurityContextHolder.getContext().setAuthentication(auth);

        // 4. 將狀態綁定到 Session 中 (最關鍵的一步！)
        HttpSession session = request.getSession(true);

        // 這是你原本存放使用者資料的地方，保留著完全沒問題，方便你前端畫面使用
        session.setAttribute("loginMember", member);

        // 🌟 新增這行：把安管中心的安全狀態，用 Spring Security 指定的專屬名稱存進 Session 裡！
        session.setAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                SecurityContextHolder.getContext()
        );
    }

    // 若有 redirect 參數則跳轉，否則回首頁
    private String redirectOrHome(String redirect) {
        if (redirect != null && !redirect.isBlank()) {
            return "redirect:" + redirect;
        }
        return "redirect:/home";
    }

    /** 取出並清除 session 中的 socialRedirect，無則回傳 fallback */
    private String consumeSocialRedirect(HttpSession session, String fallback) {
        String url = (String) session.getAttribute("socialRedirect");
        session.removeAttribute("socialRedirect");
        return (url != null && !url.isBlank()) ? url : fallback;
    }

    /** 取出 session 中的登入會員，未登入則回傳 null */
    private MemberEntity getLoginMember(HttpSession session) {
        return (MemberEntity) session.getAttribute("loginMember");
    }

    /** 暫存第三方登入資料到 session，等待註冊頁補齊後綁定 */
    private void storePendingSocial(HttpSession session, AuthProvider provider, SocialProfileDTO profile) {
        session.setAttribute("socialProvider", provider);
        session.setAttribute("socialId", profile.providerId());
        session.setAttribute("socialName", profile.name());
        session.setAttribute("socialEmail", profile.email());
    }

    /** 註冊成功後，若 session 中有待綁定的第三方資料，則自動完成綁定並登入 */
    private void linkPendingSocialOauth(String email, HttpSession session, HttpServletRequest request) {
        String socialId = (String) session.getAttribute("socialId");
        AuthProvider socialProvider = (AuthProvider) session.getAttribute("socialProvider");
 
        if (socialId == null || socialProvider == null) return;
 
        memberRepo.findByEmail(email).ifPresent(member -> {
            try {
                socialAuthService.link(member, socialProvider, socialId);
            } catch (IllegalStateException ignored) {
                // 已綁定則略過
            }
            saveLoginSession(member, request);
        });
 
        session.removeAttribute("socialProvider");
        session.removeAttribute("socialId");
        session.removeAttribute("socialName");
        session.removeAttribute("socialEmail");
        session.removeAttribute("socialRedirect");
    }

    /** 解析註冊失敗原因，轉成對應的 ToastInfoDTO */
    private ToastInfoDTO resolveRegisterError(String result) {
        return switch (result) {
            case "Email已註冊" -> ToastInfoDTO.error("此 Email 已註冊");
            case "密碼不一致" -> ToastInfoDTO.error("兩次輸入的密碼不一致");
            default -> ToastInfoDTO.error("註冊失敗，請稍後再試");
        };
    }

    /** 驗證 LINE callback 的 state，避免 CSRF */
    private boolean isValidLineState(HttpSession session, String state) {
        String savedState = (String) session.getAttribute("lineLoginState");
        return savedState != null && savedState.equals(state);
    }
    
    /** 向 LINE 取得使用者資料並轉成 SocialProfileDTO */
    private SocialProfileDTO getLineProfile(String code) throws Exception {
        JsonNode profile = lineLoginService.getLineProfile(code);
 
        String providerId = profile.get("userId").asText();
        String name = profile.get("displayName").asText();
        String email = profile.has("email") && !profile.get("email").isNull()
                ? profile.get("email").asText()
                : "";
 
        return new SocialProfileDTO(providerId, name, email);
    }

    /** LINE link callback 的處理邏輯 */
    private String handleLineLink(
            String providerId, HttpSession session, RedirectAttributes redirectAttr) {
 
        session.removeAttribute("lineAction");
        MemberEntity loginMember = getLoginMember(session);
 
        if (loginMember == null) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("請先登入會員"));
            return "redirect:/auth";
        }
 
        try {
            socialAuthService.link(loginMember, AuthProvider.LINE, providerId);
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.success("LINE 綁定成功"));
        } catch (IllegalStateException e) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error(e.getMessage()));
        }
 
        return "redirect:/member";
    }

    /** 第三方快速登入：已綁定直接登入，未綁定導到註冊頁補資料 */
    private String socialQuickLogin(
            AuthProvider provider, SocialProfileDTO profile, HttpSession session,
            RedirectAttributes redirectAttr, Model model, HttpServletRequest request) {
 
        MemberEntity member = socialAuthService.findMemberByOauth(provider, profile.providerId());
 
        if (member != null) {
            saveLoginSession(member, request);
            session.removeAttribute("lineAction");
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.success(provider.name() + " 登入成功"));
            return redirectOrHome(consumeSocialRedirect(session, null));
        }
 
        // 未綁定 → 導到註冊頁補資料
        storePendingSocial(session, provider, profile);
        session.removeAttribute("lineAction");
 
        model.addAttribute("openPanel", "register");
        model.addAttribute("socialName", profile.name());
        model.addAttribute("socialEmail", profile.email());
        model.addAttribute("redirect", session.getAttribute("socialRedirect"));
        return "auth";
    }

}