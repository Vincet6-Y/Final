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
import com.example.FinalWeb.dto.SocialProfileDTO;
import com.example.FinalWeb.dto.ToastInfoDTO;
import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.entity.MemberOauthEntity;
import com.example.FinalWeb.enums.AuthProvider;
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
                        .findByProviderAndProviderId(AuthProvider.LINE, lineUserId)
                        .isPresent();

                if (!alreadyLinked) {
                    MemberOauthEntity oauth = new MemberOauthEntity();
                    oauth.setMember(member);
                    oauth.setProvider(AuthProvider.LINE);
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
    public String lineCallback(@RequestParam String code, @RequestParam String state, 
        HttpSession session, RedirectAttributes redirectAttr, Model model) {

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
                    AuthProvider.LINE, profile, session, redirectAttr, model
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
    private String bindSocialAccount(AuthProvider provider,
                                String providerId,
                                HttpSession session,
                                RedirectAttributes redirectAttr) {

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
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("此 LINE 帳號已綁定其他會員"));
            session.removeAttribute("lineAction");
            return "redirect:/member";
        }

        boolean alreadyBound = memberOauthRepo.existsByMember_MemberIdAndProvider(
                loginMember.getMemberId(), provider
        );

        if (alreadyBound) {
            redirectAttr.addFlashAttribute("toast", ToastInfoDTO.error("此會員已綁定 LINE"));
            session.removeAttribute("lineAction");
            return "redirect:/member";
        }

        MemberOauthEntity oauth = new MemberOauthEntity();
        oauth.setMember(loginMember);
        oauth.setProvider(provider);
        oauth.setProviderId(providerId);
        memberOauthRepo.save(oauth);

        session.removeAttribute("lineAction");
        redirectAttr.addFlashAttribute("toast", ToastInfoDTO.success("LINE 綁定成功"));
        return "redirect:/member";
    }

    // 第三方快速登入流程：已綁定則直接登入，未綁定則帶入註冊頁補齊資料
    private String socialQuickLogin(AuthProvider provider,
                                SocialProfileDTO profile,
                                HttpSession session,
                                RedirectAttributes redirectAttr,
                                Model model) {

        MemberEntity member = memberOauthRepo
                .findByProviderAndProviderId(provider, profile.providerId())
                .map(MemberOauthEntity::getMember)
                .orElse(null);

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

        session.setAttribute("lineUserId", profile.providerId());
        session.setAttribute("lineName", profile.name());
        session.setAttribute("lineEmail", profile.email());
        session.removeAttribute("lineAction");

        model.addAttribute("openPanel", "register");
        model.addAttribute("lineName", profile.name());
        model.addAttribute("lineEmail", profile.email());
        model.addAttribute("redirect", session.getAttribute("lineLoginRedirect"));

        return "auth";
    }


}