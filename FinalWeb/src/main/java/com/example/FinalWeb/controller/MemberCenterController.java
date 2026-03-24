package com.example.FinalWeb.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.example.FinalWeb.dto.*;
import com.example.FinalWeb.service.*;
import com.example.FinalWeb.entity.FavoritesEntity;
import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.entity.OrdersEntity;
import com.example.FinalWeb.enums.AuthProvider;

import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/member")
public class MemberCenterController {
    @Autowired
    private FavoritesService favoritesService;
    @Autowired
    private OrderService orderService;
    @Autowired
    private MemberService memberService;
    @Autowired
    private SocialAuthService socialAuthService;

    private static final String DEFAULT_MEMBER_IMG_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuCZn0hF5odiTpTSvLLJlYC3FAJl-mVbD9Q7ubYgm7DvAcUSyRp43TqfRb1mZLIN8sapDa0aGJm2xOrg0H78C8c6Ses7XzltLJOwoCUFFWG5hoYHppigEM5D-4zzee5STn_MPefGID3DCWCLXW13xuVOfu07C0ndadqD3Qa_l7ffs4lkF_ohFVipsBhgCTJeVbPq7P5EMXQF12StVLfHdDXXWP1cy4kZooAXFCOPx9P2xizu0ZqgMNT3kIgFqhRlsKEvZuGJXQ-2gpc";

    // 處理登出
    @GetMapping("/logout")
    public String logout(HttpSession session,
            RedirectAttributes redirectAttr) {

        session.invalidate();

        redirectAttr.addFlashAttribute("toast", ToastInfoDTO.success("已成功登出"));

        return "redirect:/home";
    }


    // 🌟 會員首頁邏輯
    @GetMapping
    public String memberHome(HttpSession session, Model model) {
        // 1. 確認會員是否登入
        MemberEntity loginMember = (MemberEntity) session.getAttribute("loginMember");
        if (loginMember == null) {
            return "redirect:/auth"; // 沒登入就踢回登入頁
        }
        Integer memberId = loginMember.getMemberId();
        // 2. 改由 OrderService 來負責撈取該會員的訂單
        List<OrdersEntity> myOrders = orderService.getMemberOrders(memberId);
        // 3. 算每筆訂單的總金額
        Map<Integer, Integer> orderTotals = new HashMap<>();
        for (OrdersEntity order : myOrders) {
            orderTotals.put(order.getOrderId(), orderService.calculateTotalAmount(order));
        }
        // 4. 撈出這個會員的收藏清單 (交給 FavoritesService)
        List<FavoritesEntity> myFavorites = favoritesService.getMemberFavorites(memberId);

        boolean lineBound = socialAuthService.isBound(memberId, AuthProvider.LINE);
        boolean googleBound = socialAuthService.isBound(memberId, AuthProvider.GOOGLE);
        
        // 5. 把資料丟給前端 (讓前端的 HTML 可以跑迴圈)
        model.addAttribute("orders", myOrders);
        model.addAttribute("orderTotals", orderTotals);
        model.addAttribute("favorites", myFavorites);
        model.addAttribute("lineBound", lineBound);
        model.addAttribute("googleBound", googleBound);
        model.addAttribute("defaultMemberImgUrl", DEFAULT_MEMBER_IMG_URL);

        return "member";
    }

    // 處理前端 AJAX 修改密碼的請求(Toast)
    @PostMapping("/change-passwd")
    @ResponseBody
    // 1. 將泛型從 String 改為 ToastInfoDTO
    public ResponseEntity<ToastInfoDTO> changePasswd(@RequestBody PasswdChangeDTO dto, HttpSession session) {
        MemberEntity loginMember = (MemberEntity) session.getAttribute("loginMember");

        if (loginMember == null) {
            // 2. 登入失敗：回傳 401 狀態碼，並打包 error 類型的 DTO
            return ResponseEntity.status(401).body(ToastInfoDTO.error("請先登入"));
        }
        String result = memberService.changePasswd(loginMember.getEmail(), dto);
        if ("密碼修改成功".equals(result)) {
            // 3. 修改成功：回傳 200 狀態碼，並打包 success 類型的 DTO
            return ResponseEntity.ok(ToastInfoDTO.success(result));
        } else {
            // 4. 修改失敗（例如舊密碼錯誤）：回傳 400，並打包 error 類型的 DTO
            return ResponseEntity.badRequest().body(ToastInfoDTO.error(result));
        }
    }


    @GetMapping("/profile")
    public String getProfile(HttpSession session, Model model) {

        MemberEntity loginMember = (MemberEntity) session.getAttribute("loginMember");

        if (loginMember == null) {
            return "redirect:/auth";
        }

        // 重新抓 DB（避免 session 資料舊）
        MemberEntity member = memberService.findById(loginMember.getMemberId());

        model.addAttribute("member", member);
        model.addAttribute("defaultMemberImgUrl", DEFAULT_MEMBER_IMG_URL);

        return "memberProfile";
    }

    @PostMapping("/profile")
    public String updateProfile(MemberProfileDTO dto,
                                HttpSession session,
                                RedirectAttributes redirectAttr) {

        MemberEntity loginMember = (MemberEntity) session.getAttribute("loginMember");

        if (loginMember == null) {
            return "redirect:/auth";
        }

        // 1. 更新 DB
        memberService.updateMemberProfile(loginMember.getMemberId(), dto);

        // 2. 同步 session（重點）
        loginMember.setName(dto.name());
        loginMember.setPhone(dto.phone());
        loginMember.setBirthday(dto.birthday());
        loginMember.setMemberImgUrl(dto.memberImgUrl());
        session.setAttribute("loginMember", loginMember);

        // 3. toast
        redirectAttr.addFlashAttribute(
            "toast",
            ToastInfoDTO.success("資料更新成功")
        );

        return "redirect:/member/profile";
    }


    @PostMapping("/profile/avatar")
    @ResponseBody
    public ResponseEntity<?> updateAvatar(@RequestBody Map<String, String> body,
                                        HttpSession session) {

        MemberEntity loginMember = (MemberEntity) session.getAttribute("loginMember");

        if (loginMember == null) {
            return ResponseEntity.status(401).body("請先登入");
        }

        String avatarUrl = body.get("avatarUrl");

        memberService.updateMemberAvatar(loginMember.getMemberId(), avatarUrl);

        // 同步 session（重要）
        loginMember.setMemberImgUrl(avatarUrl);
        session.setAttribute("loginMember", loginMember);

        return ResponseEntity.ok().build();
    }

    // 刪除帳號
    @PostMapping("/delete-account")
    @ResponseBody
    public ResponseEntity<ToastInfoDTO> deleteAccount(HttpSession session) {
        MemberEntity loginMember = (MemberEntity) session.getAttribute("loginMember");

        if (loginMember == null) {
            return ResponseEntity.status(401).body(ToastInfoDTO.error("請先登入"));
        }

        memberService.softDeleteMember(loginMember.getMemberId());
        session.invalidate();

        return ResponseEntity.ok(ToastInfoDTO.success("帳號已刪除"));
    }

}