package com.example.FinalWeb.controller;

import java.util.HashMap;
import java.util.List;
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
import org.springframework.http.ResponseEntity;

import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.repo.MemberRepo;
import com.example.FinalWeb.service.AdminOrderService;

@RestController
@RequestMapping("/api/admin")
public class AdminRevenueController {

    @Autowired
    private AdminOrderService adminOrderService;
    @Autowired
    private MemberRepo memberRepo;

    // 處理後台營收圖表所需資料
    @GetMapping("/revenue-stats")
    public Map<String, Object> getRevenueStats() {
        Map<String, Object> response = new HashMap<>();

        // 取得真實的總營收
        long totalRevenue = adminOrderService.getTotalRevenue();

        // 💡 呼叫新的方法來取得真實會員數
        long realActiveUsers = adminOrderService.getTotalCount();

        response.put("totalRevenue", totalRevenue);
        response.put("activeUsers", realActiveUsers); // 這裡改為動態變數
        response.put("revenueGrowth", 12.5);

        return response;
    }

    @GetMapping("/members")
    public Page<MemberEntity> getAllMembers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "3") int size) {

        // 設定排序（依 ID 升冪）與分頁資訊
        Pageable pageable = PageRequest.of(page, size, Sort.by("memberId").ascending());
        return memberRepo.findAll(pageable);
    }

    @GetMapping("/revenue-chart")
    public ResponseEntity<List<Integer>> getRevenueChartData() {
        return ResponseEntity.ok(adminOrderService.getMonthlyRevenueForCurrentYear());
    }

    @GetMapping("/revenue-chart/quarterly")
    public ResponseEntity<List<Integer>> getQuarterlyChartData() {
        return ResponseEntity.ok(adminOrderService.getQuarterlyRevenueForCurrentYear());
    }
}