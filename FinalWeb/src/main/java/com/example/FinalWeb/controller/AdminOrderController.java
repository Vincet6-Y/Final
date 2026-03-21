package com.example.FinalWeb.controller;

import com.example.FinalWeb.service.AdminOrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/orders")
public class AdminOrderController {

    @Autowired
    private AdminOrderService adminOrderService;

    // 修改訂單狀態 (例如點擊「批量處理」或「查看詳情」後的更動)
    @PostMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Integer id, @RequestBody Map<String, String> payload) {
        adminOrderService.updateOrderStatus(id, payload.get("status"));
        return ResponseEntity.ok("更新成功");
    }

    // 取得後台訂單明細
    @GetMapping("/detail/{id}")
    public ResponseEntity<?> getOrderDetail(@PathVariable Integer id) {
        try {
            var detail = adminOrderService.getOrderDetailWithItems(id);
            if (detail == null)
                return ResponseEntity.status(404).body("找不到該訂單");
            return ResponseEntity.ok(detail);
        } catch (Exception e) {
            return ResponseEntity.status(500).body("伺服器錯誤");
        }
    }
}
