package com.example.FinalWeb.controller;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

import com.example.FinalWeb.dto.GoogleLoginRequestDTO;
import com.example.FinalWeb.dto.MemberLoginDTO;
import com.example.FinalWeb.dto.MemberRegisterDTO;
import com.example.FinalWeb.dto.SocialProfileDTO;
import com.example.FinalWeb.dto.ToastInfoDTO;
import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.entity.MemberOauthEntity;
import com.example.FinalWeb.enums.AuthProvider;
import com.example.FinalWeb.repo.MemberOauthRepo;
import com.example.FinalWeb.repo.MemberRepo;
import com.example.FinalWeb.service.GoogleLoginService;
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
    private GoogleLoginService googleLoginService;

    @Autowired
    private MemberRepo memberRepo;

    @Autowired
    private MemberOauthRepo memberOauthRepo;


    // 處理登入
    @PostMapping("/login")
    public String login(
        MemberLoginDTO login, HttpSession session, @RequestParam(required = false) String redirect,
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
                        Model model,
                        HttpServletRequest request) {

        String result = memberService.register(register);

        if (!"註冊成功".equals(result)) {
            if ("Email已註冊".equals(result)) {
                model.addAttribute("toast", ToastInfoDTO.error("此 Email 已註冊"));
            } else if ("密碼不一致".equals(result)) {
                model.addAttribute("toast", ToastInfoDTO.error("兩次輸入的密碼不一致"));
            }

            model.addAttribute("openPanel", "register");
            model.addAttribute("registerData", register);

            // 第三方登入第一次進來補資料時，失敗要把預填資料帶回去
            model.addAttribute("socialName", session.getAttribute("socialName"));
            model.addAttribute("socialEmail", session.getAttribute("socialEmail"));

            return "auth";
        }

        String socialId = (String) session.getAttribute("socialId");
        AuthProvider socialProvider = (AuthProvider) session.getAttribute("socialProvider");

        if (socialId != null && socialProvider != null) {
            MemberEntity member = memberRepo.findByEmail(register.email()).orElse(null);

            if (member != null) {
                boolean alreadyLinked = memberOauthRepo
                        .findByProviderAndProviderId(socialProvider, socialId)
                        .isPresent();

                if (!alreadyLinked) {
                    MemberOauthEntity oauth = new MemberOauthEntity();
                    oauth.setMember(member);
                    oauth.setProvider(socialProvider);
                    oauth.setProviderId(socialId);
                    memberOauthRepo.save(oauth);
                }

                // 註冊成功後直接登入
                saveLoginSession(member, request);
            }

            // 清除第三方登入暫存資料
            session.removeAttribute("socialProvider");
            session.removeAttribute("socialId");
            session.removeAttribute("socialName");
            session.removeAttribute("socialEmail");
            session.removeAttribute("socialRedirect");
        }

        return "redirect:/home";
    }

    @PostMapping("/google/login")
    @ResponseBody
    public Map<String, Object> googleLogin(@RequestBody GoogleLoginRequestDTO req,
                                        HttpSession session,
                                        HttpServletRequest request) {

        try {
            SocialProfileDTO profile = googleLoginService.verifyGoogleIdToken(req.idToken());

            MemberEntity member = memberOauthRepo
                    .findByProviderAndProviderId(AuthProvider.GOOGLE, profile.providerId())
                    .map(MemberOauthEntity::getMember)
                    .orElse(null);

            if (member != null) {
                saveLoginSession(member, request);

                String redirectUrl = (String) session.getAttribute("socialRedirect");
                session.removeAttribute("socialRedirect");

                return Map.of(
                        "success", true,
                        "redirectUrl", (redirectUrl != null && !redirectUrl.isBlank()) ? redirectUrl : "/home"
                );
            }

            session.setAttribute("socialProvider", AuthProvider.GOOGLE);
            session.setAttribute("socialId", profile.providerId());
            session.setAttribute("socialName", profile.name());
            session.setAttribute("socialEmail", profile.email());

            System.out.println("=== googleLogin set session ===");
            System.out.println("session id = " + session.getId());
            System.out.println("socialProvider = " + session.getAttribute("socialProvider"));
            System.out.println("socialName = " + session.getAttribute("socialName"));
            System.out.println("socialEmail = " + session.getAttribute("socialEmail"));

            return Map.of(
                    "success", true,
                    "redirectUrl", "/auth"
            );

        } catch (Exception e) {
            e.printStackTrace();
            return Map.of(
                    "success", false,
                    "message", "Google 登入失敗"
            );
        }
    }

    @PostMapping("/google/unlink")
    @ResponseBody
    @Transactional
    public Map<String, Object> unlinkGoogle(HttpSession session) {

        MemberEntity loginMember = (MemberEntity) session.getAttribute("loginMember");

        if (loginMember == null) {
            return Map.of(
                    "success", false,
                    "message", "請先登入"
            );
        }

        Integer memberId = loginMember.getMemberId();

        // 防呆：避免把唯一登入方式解除掉
        if (loginMember.getPasswd() == null || loginMember.getPasswd().isBlank()) {
            return Map.of(
                    "success", false,
                    "message", "請先設定密碼後再解除 Google 綁定"
            );
        }

        boolean linked = memberOauthRepo.existsByMember_MemberIdAndProvider(memberId, AuthProvider.GOOGLE);

        if (!linked) {
            return Map.of(
                    "success", false,
                    "message", "尚未綁定 Google"
            );
        }

        memberOauthRepo.deleteByMember_MemberIdAndProvider(memberId, AuthProvider.GOOGLE);

        return Map.of(
                "success", true,
                "message", "已解除 Google 綁定"
        );
    }

    @PostMapping("/google/link")
    @ResponseBody
    public Map<String, Object> googleLink(@RequestBody GoogleLoginRequestDTO req,
                                        HttpSession session,
                                        RedirectAttributes redirectAttr) {

        try {
            MemberEntity loginMember = (MemberEntity) session.getAttribute("loginMember");
            if (loginMember == null) {
                return Map.of(
                        "success", false,
                        "message", "請先登入會員"
                );
            }

            SocialProfileDTO profile = googleLoginService.verifyGoogleIdToken(req.idToken());

            MemberEntity linkedMember = memberOauthRepo
                    .findByProviderAndProviderId(AuthProvider.GOOGLE, profile.providerId())
                    .map(MemberOauthEntity::getMember)
                    .orElse(null);

            if (linkedMember != null) {
                return Map.of(
                        "success", false,
                        "message", "此 GOOGLE 帳號已綁定其他會員"
                );
            }

            boolean alreadyBound = memberOauthRepo.existsByMember_MemberIdAndProvider(
                    loginMember.getMemberId(), AuthProvider.GOOGLE
            );

            if (alreadyBound) {
                return Map.of(
                        "success", false,
                        "message", "此會員已綁定 GOOGLE"
                );
            }

            MemberOauthEntity oauth = new MemberOauthEntity();
            oauth.setMember(loginMember);
            oauth.setProvider(AuthProvider.GOOGLE);
            oauth.setProviderId(profile.providerId());
            memberOauthRepo.save(oauth);

            return Map.of(
                    "success", true,
                    "message", "Google 綁定成功"
            );

        } catch (Exception e) {
            e.printStackTrace();
            return Map.of(
                    "success", false,
                    "message", "Google 綁定失敗"
            );
        }
    }

    @GetMapping("/line/login")
    public String lineLogin(@RequestParam(required = false) String redirect, HttpSession session) {
        String loginUrl = lineLoginService.getLineLoginUrl(session, redirect);
        return "redirect:" + loginUrl;
    }



    @GetMapping("/line/callback")
    public String lineCallback(@RequestParam String code, @RequestParam String state, 
        HttpSession session, RedirectAttributes redirectAttr, Model model, HttpServletRequest request) {

        if (!isValidLineState(session, state)) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("LINE 驗證失敗"));
            return "redirect:/auth";
        }

        try {
            SocialProfileDTO profile = getLineProfile(code);
            String lineAction = (String) session.getAttribute("lineAction");

            session.removeAttribute("lineLoginState");

            if ("link".equals(lineAction)) {
                return bindSocialAccount(
                    AuthProvider.LINE, profile.providerId(), session, redirectAttr
                );
            }

            return socialQuickLogin(
                    AuthProvider.LINE, profile, session, redirectAttr, model, request
            );

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
    public String lineUnlink(HttpSession session, RedirectAttributes redirectAttr) {

        MemberEntity loginMember = (MemberEntity) session.getAttribute("loginMember");
        if (loginMember == null) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("請先登入會員"));
            return "redirect:/auth";
        }

        boolean lineBound = memberOauthRepo.existsByMember_MemberIdAndProvider(
                loginMember.getMemberId(), AuthProvider.LINE
        );

        if (!lineBound) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("尚未綁定 LINE"));
            return "redirect:/member";
        }

        lineLoginService.unlinkLine(loginMember.getMemberId());

        redirectAttr.addFlashAttribute("toast", ToastInfoDTO.success("LINE 已解除綁定"));
        return "redirect:/member";
    }



    // ==================== 以下是 helper 方法 ====================

    // 建立登入後的 Session 與 Spring Security 驗證資訊
    private void saveLoginSession(MemberEntity member, HttpServletRequest request) {

        // 1. 準備權限清單 (資料庫已是 ROLE_ADMIN，直接取用)
        List<GrantedAuthority> authorities =
                AuthorityUtils.createAuthorityList(member.getRole());

        // 2. 建立一個官方認可的身份憑證 (Authentication)
        Authentication auth =
                new UsernamePasswordAuthenticationToken(member.getEmail(), null, authorities);

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

    // 驗證 LINE callback 的 state 是否與 session 中保存的一致，避免 CSRF 攻擊
    private boolean isValidLineState(HttpSession session, String state) {
        String savedState = (String) session.getAttribute("lineLoginState");
        return savedState != null && savedState.equals(state);
    }

    // 向 LINE 取得使用者資料，並轉成共用的 SocialProfileDTO
    private SocialProfileDTO getLineProfile(String code) throws Exception {
        JsonNode profile = lineLoginService.getLineProfile(code);

        String providerId = profile.get("userId").asText();
        String name = profile.get("displayName").asText();

        String email = "";
        if (profile.has("email") && !profile.get("email").isNull()) {
            email = profile.get("email").asText();
        }

        return new SocialProfileDTO(providerId, name, email);
    }

    // 綁定第三方登入帳號到目前登入的會員
    private String bindSocialAccount(
        AuthProvider provider, String providerId, 
        HttpSession session, RedirectAttributes redirectAttr) {

        String providerName = provider.name();
        MemberEntity loginMember = (MemberEntity) session.getAttribute("loginMember");
        if (loginMember == null) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("請先登入會員"));
            session.removeAttribute("lineAction");
            return "redirect:/auth";
        }

        MemberEntity linkedMember = memberOauthRepo
                .findByProviderAndProviderId(provider, providerId)
                .map(MemberOauthEntity::getMember)
                .orElse(null);

        if (linkedMember != null) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("此 " + providerName + " 帳號已綁定其他會員"));
            session.removeAttribute("lineAction");
            return "redirect:/member";
        }

        boolean alreadyBound = memberOauthRepo.existsByMember_MemberIdAndProvider(
                loginMember.getMemberId(), provider
        );

        if (alreadyBound) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("此會員已綁定 " + providerName));
            session.removeAttribute("lineAction");
            return "redirect:/member";
        }

        MemberOauthEntity oauth = new MemberOauthEntity();
        oauth.setMember(loginMember);
        oauth.setProvider(provider);
        oauth.setProviderId(providerId);
        memberOauthRepo.save(oauth);

        session.removeAttribute("lineAction");
        redirectAttr.addFlashAttribute("toast", ToastInfoDTO.success(providerName + " 綁定成功"));
        return "redirect:/member";
    }

    // 第三方快速登入流程：已綁定則直接登入，未綁定則帶入註冊頁補齊資料
    private String socialQuickLogin(
        AuthProvider provider, SocialProfileDTO profile, HttpSession session,
        RedirectAttributes redirectAttr, Model model,  HttpServletRequest request) {

        String providerName = provider.name();
        MemberEntity member = memberOauthRepo
                .findByProviderAndProviderId(provider, profile.providerId())
                .map(MemberOauthEntity::getMember)
                .orElse(null);

        // 已綁定 → 直接登入
        if (member != null) {
            saveLoginSession(member, request);
            session.removeAttribute("lineAction");

            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.success(providerName + " 登入成功"));

            String redirectUrl = (String) session.getAttribute("socialRedirect");
            session.removeAttribute("socialRedirect");

            if (redirectUrl != null && !redirectUrl.isBlank()) {
                return "redirect:" + redirectUrl;
            }

            return "redirect:/home";
        }

        // 未綁定 → 暫存第三方資料，導到註冊頁補資料
        session.setAttribute("socialProvider", provider);
        session.setAttribute("socialId", profile.providerId());
        session.setAttribute("socialName", profile.name());
        session.setAttribute("socialEmail", profile.email());
        session.removeAttribute("lineAction");

        model.addAttribute("openPanel", "register");
        model.addAttribute("socialName", profile.name());
        model.addAttribute("socialEmail", profile.email());
        model.addAttribute("redirect", session.getAttribute("socialRedirect"));
        return "auth";
    }


}