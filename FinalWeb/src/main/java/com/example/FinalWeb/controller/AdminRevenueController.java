package com.example.FinalWeb.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;
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

    // 切換會員權限
    @PutMapping("/members/{id}/role")
    public ResponseEntity<?> toggleMemberRole(@PathVariable Integer id) {
        MemberEntity member = memberRepo.findById(id).orElse(null);
        if (member == null) return ResponseEntity.notFound().build();
        
        if ("ROLE_ADMIN".equals(member.getRole())) {
            member.setRole("ROLE_USER");
        } else {
            member.setRole("ROLE_ADMIN");
        }
        memberRepo.save(member);
        return ResponseEntity.ok(Map.of("message", "更新成功", "newRole", member.getRole()));
    }

    // 切換帳號啟用/停權狀態 (使用 deleted 欄位假象停權)
    @PutMapping("/members/{id}/status")
    public ResponseEntity<?> toggleMemberStatus(@PathVariable Integer id) {
        MemberEntity member = memberRepo.findById(id).orElse(null);
        if (member == null) return ResponseEntity.notFound().build();
        
        member.setDeleted(!member.isDeleted());
        memberRepo.save(member);
        return ResponseEntity.ok(Map.of("message", "更新成功", "isDeleted", member.isDeleted()));
    }

    // 取得會員詳細資料 (包含訂單與活動紀錄)
    @GetMapping("/members/{id}/details")
    @Transactional
    public ResponseEntity<?> getMemberDetails(@PathVariable Integer id) {
        MemberEntity member = memberRepo.findById(id).orElse(null);
        if (member == null) return ResponseEntity.notFound().build();
        
        List<Map<String, Object>> ordersList = member.getOrders() != null 
            ? member.getOrders().stream().map(order -> {
                Map<String, Object> map = new HashMap<>();
                map.put("orderId", order.getOrderId());
                map.put("payStatus", order.getPayStatus());
                map.put("orderTime", order.getOrderTime());
                return map;
            }).collect(Collectors.toList())
            : List.of();

        Map<String, Object> response = new HashMap<>();
        response.put("memberId", member.getMemberId());
        response.put("name", member.getName());
        response.put("email", member.getEmail());
        response.put("phone", member.getPhone());
        response.put("myPlanCount", member.getMyPlans() != null ? member.getMyPlans().size() : 0);
        response.put("orders", ordersList);
        
        return ResponseEntity.ok(response);
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