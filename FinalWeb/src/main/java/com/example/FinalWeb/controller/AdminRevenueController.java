package com.example.FinalWeb.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import com.example.FinalWeb.service.OrderService;

@RestController
@RequestMapping("/api/admin")
public class AdminRevenueController { // 修正拼字

    @Autowired
    private OrderService orderService;

    // 確保這裡加上了 @GetMapping 註解
    // 在 AdminRevenueController.java 中修改 getRevenueStats 方法
    @GetMapping("/revenue-stats")
    public Map<String, Object> getRevenueStats() {
        Map<String, Object> response = new HashMap<>();

        // 取得真實的總營收
        long totalRevenue = orderService.getTotalRevenue();

        // 💡 呼叫新的方法來取得真實會員數（假設你稍後在 Service 寫好這個方法）
        // 如果暫時沒有 Service，可以先改成一個明顯的數字測試，例如 888
        long realActiveUsers = orderService.getTotalMemberCount();

        response.put("totalRevenue", totalRevenue);
        response.put("activeUsers", realActiveUsers); // 這裡改為動態變數
        response.put("revenueGrowth", 12.5);

        return response;
    }

    // 在 AdminRevenueController.java 中新增
    @Autowired
    private com.example.FinalWeb.repo.MemberRepo memberRepo; // 確保有注入 MemberRepo

    @GetMapping("/members")
    public Page<com.example.FinalWeb.entity.MemberEntity> getAllMembers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "3") int size) {

        // 設定排序（依 ID 升冪）與分頁資訊
        Pageable pageable = PageRequest.of(page, size, Sort.by("memberId").ascending());
        return memberRepo.findAll(pageable);
    }

    @GetMapping("/revenue-chart")
    public org.springframework.http.ResponseEntity<java.util.List<Integer>> getRevenueChartData() {
        return org.springframework.http.ResponseEntity.ok(orderService.getMonthlyRevenueForCurrentYear());
    }

    @GetMapping("/revenue-chart/quarterly")
    public org.springframework.http.ResponseEntity<java.util.List<Integer>> getQuarterlyChartData() {
        return org.springframework.http.ResponseEntity.ok(orderService.getQuarterlyRevenueForCurrentYear());
    }
}