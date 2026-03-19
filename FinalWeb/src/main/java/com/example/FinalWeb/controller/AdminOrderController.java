package com.example.FinalWeb.controller;

import com.example.FinalWeb.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

    @Autowired
    private OrderService orderService;

    // 獲取上方三個卡片的數字
    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        return ResponseEntity.ok(orderService.getAdminDashboardStats());
    }

    // 獲取下方的訂單列表
    @GetMapping("/list")
    public ResponseEntity<?> getOrderList(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(orderService.getAllOrdersForAdmin(status, keyword));
    }
    
    // 修改訂單狀態 (例如點擊「批量處理」或「查看詳情」後的更動)
    @PostMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Integer id, @RequestBody Map<String, String> payload) {
        orderService.updateOrderStatus(id, payload.get("status"));
        return ResponseEntity.ok("更新成功");
    }
    // 在 AdminOrderController.java 中新增
@GetMapping("/{id}")
public ResponseEntity<?> getOrderDetail(@PathVariable Integer id) {
    try {
        // 使用 service 獲取訂單詳情
        return ResponseEntity.ok(orderService.getOrderById(id));
    } catch (Exception e) {
        return ResponseEntity.status(404).body("找不到該訂單");
    }
}

}