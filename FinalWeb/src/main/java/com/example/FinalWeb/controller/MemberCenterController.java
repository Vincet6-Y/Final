package com.example.FinalWeb.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.example.FinalWeb.dto.ToastInfoDTO;
import com.example.FinalWeb.entity.FavoritesEntity;
import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.entity.OrdersEntity;
import com.example.FinalWeb.service.FavoritesService;
import com.example.FinalWeb.service.OrderService;

import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/member")
public class MemberCenterController {
    @Autowired
    private FavoritesService favoritesService;
    @Autowired
    private OrderService orderService;

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
}