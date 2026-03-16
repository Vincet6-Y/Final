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
import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.entity.OrdersEntity;
import com.example.FinalWeb.repo.OrdersRepo;
import com.example.FinalWeb.service.OrderService;

import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/member")
public class MemberCenterController {
    // 用來查訂單跟算錢
    @Autowired
    private OrdersRepo ordersRepo;

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

    // 🌟 2. 這是我們剛剛說要新增的「會員首頁」邏輯！
    // 因為類別上面有 @RequestMapping("/member")，所以這個網址會是 /member/home
    @GetMapping
    public String memberHome(HttpSession session, Model model) {

        // 1. 確認會員是否登入
        MemberEntity loginMember = (MemberEntity) session.getAttribute("loginMember");
        if (loginMember == null) {
            return "redirect:/auth"; // 沒登入就踢回登入頁
        }

        // 2. 去資料庫撈出這個會員的訂單，由新到舊排序
        List<OrdersEntity> myOrders = ordersRepo.findByMember_MemberIdOrderByOrderTimeDesc(loginMember.getMemberId());

        // 3. 算每筆訂單的總金額
        Map<Integer, Integer> orderTotals = new HashMap<>();
        for (OrdersEntity order : myOrders) {
            orderTotals.put(order.getOrderId(), orderService.calculateTotalAmount(order));
        }

        // 4. 把資料丟給前端 (讓前端的 purchaseRecord.html 可以跑迴圈)
        model.addAttribute("orders", myOrders);
        model.addAttribute("orderTotals", orderTotals);

        // 🌟 請注意這裡：
        // 如果你的會員首頁 HTML 叫做 "memberHome.html"，就改成 return "memberHome";
        return "member";
    }
}
