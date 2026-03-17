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

import com.example.FinalWeb.dto.PasswdChangeDto;
import com.example.FinalWeb.dto.ToastInfoDTO;
import com.example.FinalWeb.entity.FavoritesEntity;
import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.entity.OrdersEntity;
import com.example.FinalWeb.service.FavoritesService;
import com.example.FinalWeb.service.MemberService;
import com.example.FinalWeb.service.OrderService;

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
        // 5. 把資料丟給前端 (讓前端的 HTML 可以跑迴圈)
        model.addAttribute("orders", myOrders);
        model.addAttribute("orderTotals", orderTotals);
        model.addAttribute("favorites", myFavorites);

        return "member";
    }

    // 處理前端 AJAX 修改密碼的請求(Toast)
    @PostMapping("/change-passwd")
    @ResponseBody
    // 1. 將泛型從 String 改為 ToastInfoDTO
    public ResponseEntity<ToastInfoDTO> changePasswd(@RequestBody PasswdChangeDto dto, HttpSession session) {
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
}