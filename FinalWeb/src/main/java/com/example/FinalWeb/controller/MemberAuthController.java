package com.example.FinalWeb.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.example.FinalWeb.dto.*;
import com.example.FinalWeb.service.*;
import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.enums.AuthProvider;
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
    private EmailVerifyService emailVerifyService;

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
        memberService.saveLoginSession(member, request);
        redirectAttr.addFlashAttribute("toast", ToastInfoDTO.success("登入成功，歡迎回來"));

        return redirectOrHome(redirect);
    }

    // 處理註冊
    @PostMapping("/register")
    @ResponseBody
    public Map<String, Object> register(@RequestBody MemberRegisterDTO register,
            HttpSession session,
            HttpServletRequest request) {

        // 若 session 有社群 email，強制使用 session 的值，防止前端竄改
        String socialEmail = (String) session.getAttribute("socialEmail");
        if (socialEmail != null && !socialEmail.isBlank()) {
            if (!socialEmail.equals(register.email())) {
                return Map.of("success", false, "message", "Email 不符合");
            }
        }
        String result = memberService.register(register);

        if (!"註冊成功".equals(result)) {
            ToastInfoDTO toast = resolveRegisterError(result);
            return Map.of("success", false, "message", toast.message());
        }

        MemberEntity member = memberService.findByEmail(register.email());
        memberService.saveLoginSession(member, request);

        linkPendingSocialOauth(register.email(), session, request);
        return Map.of("success", true, "redirectUrl", "/home", "message", "註冊成功，歡迎加入！");
    }

    // ==================== Google ====================

    @PostMapping("/google/login")
    @ResponseBody
    public Map<String, Object> googleLogin(@RequestBody GoogleLoginRequestDTO req,
            HttpSession session, HttpServletRequest request) {

        try {
            SocialProfileDTO profile = googleLoginService.verifyGoogleIdToken(req.idToken());
            MemberEntity member = socialAuthService.findMemberByOauth(AuthProvider.GOOGLE, profile.providerId());

            if (member != null) {
                memberService.saveLoginSession(member, request);
                // 【修改這裡】判斷前端是否有傳 redirect 參數過來，有的話就使用它
                String redirectUrl = (req.redirect() != null && !req.redirect().isBlank()) ? req.redirect() : "/home";
                return Map.of("success", true, "redirectUrl", redirectUrl);
            }

            // 未綁定 → 暫存資料，導到註冊頁補資料
            storePendingSocial(session, AuthProvider.GOOGLE, profile);

            // 【新增這裡】如果需要導向註冊，把 redirect 存進 session 中，以便註冊完後使用
            if (req.redirect() != null && !req.redirect().isBlank()) {
                session.setAttribute("socialRedirect", req.redirect());
            }

            return Map.of("success", true, "redirectUrl", "/auth");

        } catch (Exception e) {
            e.printStackTrace();
            return Map.of("success", false, "message", "Google 登入失敗");
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

    @PostMapping("/google/unlink")
    @ResponseBody
    public Map<String, Object> unlinkGoogle(HttpSession session) {

        MemberEntity loginMember = getLoginMember(session);

        if (loginMember == null)
            return Map.of("success", false, "message", "請先登入");

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

    // ==================== LINE ====================

    @GetMapping("/line/login")
    public String lineLogin(@RequestParam(required = false) String redirect, HttpSession session) {
        return "redirect:" + lineLoginService.getLineLoginUrl(session, redirect);
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

    // 解除目前會員的 LINE 綁定
    @PostMapping("/line/unlink")
    public String lineUnlink(HttpSession session, RedirectAttributes redirectAttr) {

        MemberEntity loginMember = getLoginMember(session);
        if (loginMember == null) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("請先登入會員"));
            return "redirect:/auth";
        }
        // 補上密碼檢查，避免純 LINE 登入的帳號解除後無法登入
        if (loginMember.getPasswd() == null || loginMember.getPasswd().isBlank()) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("請先設定密碼後再解除 LINE 綁定"));
            return "redirect:/member";
        }
        try {
            socialAuthService.unlink(loginMember.getMemberId(), AuthProvider.LINE);
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.success("LINE 已解除綁定"));
        } catch (IllegalStateException e) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error(e.getMessage()));
        }
        return "redirect:/member";
    }

    // 忘記密碼頁面
    @GetMapping("/forgot-password")
    public String forgotPasswordPage() {
        return "login/forgotPassword";
    }

    // 處理送出 email
    @PostMapping("/forgot-password")
    public String forgotPassword(@RequestParam String email,
            RedirectAttributes redirectAttr) {
        emailVerifyService.sendResetEmail(email);
        redirectAttr.addFlashAttribute("toast",
                ToastInfoDTO.info("若此 Email 已註冊，重設連結已寄出，請查收信件"));
        return "redirect:/auth/forgot-password";
    }

    // 顯示重設密碼頁面
    @GetMapping("/reset-password")
    public String resetPasswordPage(@RequestParam String token, Model model) {
        var resetToken = emailVerifyService.validateToken(token);
        if (resetToken == null) {
            model.addAttribute("error", "連結已失效或已使用，請重新申請");
        }
        model.addAttribute("token", token);
        return "login/resetPassword";
    }

    // 處理重設密碼表單
    @PostMapping("/reset-password")
    public String resetPassword(@RequestParam String token,
            @RequestParam String newPasswd,
            @RequestParam String confirmPasswd,
            RedirectAttributes redirectAttr) {
        String result = emailVerifyService.resetPassword(token, newPasswd, confirmPasswd);
        if ("success".equals(result)) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.success("密碼重設成功，請重新登入"));
            return "redirect:/auth";
        }
        redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error(result));
        return "redirect:/auth/reset-password?token=" + token;
    }

    // ==================== 以下是 helper 方法 ====================

    // 若有 redirect 參數則跳轉，否則回首頁
    private String redirectOrHome(String redirect) {
        if (redirect != null && !redirect.isBlank())
            return "redirect:" + redirect;
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
        String socialEmail = (String) session.getAttribute("socialEmail");

        if (socialId == null || socialProvider == null)
            return;

        MemberEntity member = memberService.findByEmail(email);
        if (member != null) {
            // 只有 socialEmail 有值且與註冊 email 相同時才綁定
            // LINE 沒有 email 的情況不自動綁定，讓使用者之後手動綁定
            if (socialEmail != null && !socialEmail.isBlank() && socialEmail.equals(email)) {
                try {
                    socialAuthService.link(member, socialProvider, socialId);
                } catch (IllegalStateException ignored) {
                    // 已綁定則略過
                }
            }
            memberService.saveLoginSession(member, request);
        }
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
            case "手機號碼格式不正確" -> ToastInfoDTO.error("手機號碼格式不正確");
            case "生日不能是未來日期" -> ToastInfoDTO.error("生日不能是未來日期");
            case "請輸入正確的生日" -> ToastInfoDTO.error("請輸入正確的生日");
            case "密碼需包含大小寫英文及數字（至少 8 個字元）" -> ToastInfoDTO.error("密碼需包含大小寫英文及數字（至少 8 個字元）");
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
    private String handleLineLink(String providerId, HttpSession session, RedirectAttributes redirectAttr) {

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
            memberService.saveLoginSession(member, request);
            session.removeAttribute("lineAction");
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.success(provider.name() + " 登入成功"));
            return redirectOrHome(consumeSocialRedirect(session, null));
        }

        // ✅ 新增：LINE userId 沒綁定，但 email 對得上本地帳號 → 自動綁定並直接登入
        if (profile.email() != null && !profile.email().isBlank()) {
            MemberEntity existingMember = memberService.findByEmail(profile.email());
            if (existingMember != null) {
                try {
                    socialAuthService.link(existingMember, provider, profile.providerId());
                    memberService.saveLoginSession(existingMember, request);
                    session.removeAttribute("lineAction");
                    redirectAttr.addFlashAttribute("toast",
                        ToastInfoDTO.success("已自動綁定 " + provider.name() + " 並登入，下次可直接使用快速登入"));
                    return redirectOrHome(consumeSocialRedirect(session, null));
                } catch (IllegalStateException e) {
                    // 萬一綁定失敗（理論上不會走到這，但保險起見）
                    redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error(e.getMessage()));
                    return "redirect:/auth";
                }
            }
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