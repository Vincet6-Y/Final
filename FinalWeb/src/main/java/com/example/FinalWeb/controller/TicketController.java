package com.example.FinalWeb.controller;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.HashMap;
import java.util.Map;

import javax.imageio.ImageIO;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.FinalWeb.entity.OrdersDetailEntity;
import com.example.FinalWeb.repo.OrdersDetailRepo;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

/**
 * 🎫 票券 QR Code REST API
 * 
 * 提供三個核心功能：
 * 1. GET /api/ticket/qrcode/{orderDetailId} → 回傳 QR Code PNG 圖片
 * 2. GET /api/ticket/info/{orderDetailId} → 回傳票券的 JSON 資訊 (供前端 jQuery 使用)
 * 3. POST /api/ticket/verify/{qrToken} → 工作人員掃描後驗證票券
 */
@RestController
@RequestMapping("/api/ticket")
public class TicketController {

    @Autowired
    private OrdersDetailRepo ordersDetailRepo;

    /**
     * ✅ API 1: 取得指定票券的 QR Code 圖片 (PNG)
     * 
     * 用法: <img src="/api/ticket/qrcode/123" />
     * jQuery: $('#qr').attr('src', '/api/ticket/qrcode/' + orderDetailId);
     */
    @GetMapping(value = "/qrcode/{orderDetailId}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getQrCode(@PathVariable Integer orderDetailId) {
        try {
            // 從資料庫找到票券明細
            OrdersDetailEntity detail = ordersDetailRepo.findById(orderDetailId)
                    .orElse(null);
            if (detail == null) {
                return ResponseEntity.notFound().build();
            }

            // 如果還沒有 qrToken，就自動產生一個
            if (detail.getQrToken() == null || detail.getQrToken().isEmpty()) {
                detail.setQrToken(java.util.UUID.randomUUID().toString());
                ordersDetailRepo.save(detail);
            }

            // QR Code 的內容 = 驗證 URL (包含 qrToken)
            // 工作人員掃描後會打開這個 URL 來驗證票券
            String verifyUrl = "/api/ticket/verify/" + detail.getQrToken();

            // 用 ZXing 生成 QR Code 圖片
            QRCodeWriter qrWriter = new QRCodeWriter();
            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.MARGIN, 2);

            BitMatrix bitMatrix = qrWriter.encode(verifyUrl, BarcodeFormat.QR_CODE, 300, 300, hints);
            BufferedImage image = MatrixToImageWriter.toBufferedImage(bitMatrix);

            // 轉成 byte[] 回傳
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "png", baos);
            byte[] imageBytes = baos.toByteArray();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_PNG);
            headers.setCacheControl("max-age=86400"); // 快取一天

            return new ResponseEntity<>(imageBytes, headers, HttpStatus.OK);

        } catch (Exception e) {
            System.err.println("QR Code 生成失敗: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * ✅ API 2: 取得指定票券的 JSON 資訊 (給 jQuery AJAX 用)
     * 
     * 回傳: { orderDetailId, ticketType, ticketPrice, qrToken, ticketUsed, qrCodeUrl
     * }
     */
    @GetMapping("/info/{orderDetailId}")
    public ResponseEntity<?> getTicketInfo(@PathVariable Integer orderDetailId) {
        OrdersDetailEntity detail = ordersDetailRepo.findById(orderDetailId).orElse(null);

        if (detail == null) {
            return ResponseEntity.notFound().build();
        }

        // 如果還沒有 qrToken，自動產生
        if (detail.getQrToken() == null || detail.getQrToken().isEmpty()) {
            detail.setQrToken(java.util.UUID.randomUUID().toString());
            ordersDetailRepo.save(detail);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("orderDetailId", detail.getOrderDetailId());
        result.put("ticketType", detail.getTicketType());
        result.put("ticketPrice", detail.getTicketPrice());
        result.put("qrToken", detail.getQrToken());
        result.put("ticketUsed", detail.getTicketUsed() != null ? detail.getTicketUsed() : false);
        result.put("qrCodeUrl", "/api/ticket/qrcode/" + detail.getOrderDetailId());

        return ResponseEntity.ok(result);
    }

    /**
     * ✅ API 3: 掃描 QR Code 後的驗證 (工作人員用)
     * 
     * 掃描 QR Code → 打開驗證 URL → 後端檢查 token 是否有效
     * GET /api/ticket/verify/{qrToken} → 回傳驗證結果頁面或 JSON
     */
    @GetMapping("/verify/{qrToken}")
    public ResponseEntity<?> verifyTicket(@PathVariable String qrToken) {
        OrdersDetailEntity detail = ordersDetailRepo.findByQrToken(qrToken).orElse(null);

        Map<String, Object> result = new HashMap<>();

        if (detail == null) {
            result.put("valid", false);
            result.put("message", "❌ 無效的票券 Token，找不到對應票券。");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(result);
        }

        if (detail.getTicketUsed() != null && detail.getTicketUsed()) {
            result.put("valid", false);
            result.put("message", "⚠️ 此票券已使用過！");
            result.put("ticketType", detail.getTicketType());
            return ResponseEntity.ok(result);
        }

        // ✅ 標記為已使用
        detail.setTicketUsed(true);
        ordersDetailRepo.save(detail);

        result.put("valid", true);
        result.put("message", "✅ 驗證成功！歡迎入場！");
        result.put("ticketType", detail.getTicketType());
        result.put("ticketPrice", detail.getTicketPrice());
        result.put("orderDetailId", detail.getOrderDetailId());

        return ResponseEntity.ok(result);
    }

    /**
     * ✅ API 4: 取得某訂單下所有票券的資訊 (給前端一次撈全部)
     */
    @GetMapping("/byOrder/{orderId}")
    public ResponseEntity<?> getTicketsByOrder(@PathVariable Integer orderId) {
        java.util.List<OrdersDetailEntity> details = ordersDetailRepo.findAll().stream()
                .filter(d -> d.getOrders() != null && d.getOrders().getOrderId() != null
                        && d.getOrders().getOrderId().equals(orderId))
                .toList();

        java.util.List<Map<String, Object>> ticketList = new java.util.ArrayList<>();
        for (OrdersDetailEntity detail : details) {
            // 確保每筆都有 qrToken
            if (detail.getQrToken() == null || detail.getQrToken().isEmpty()) {
                detail.setQrToken(java.util.UUID.randomUUID().toString());
                ordersDetailRepo.save(detail);
            }

            Map<String, Object> item = new HashMap<>();
            item.put("orderDetailId", detail.getOrderDetailId());
            item.put("ticketType", detail.getTicketType());
            item.put("ticketPrice", detail.getTicketPrice());
            item.put("qrToken", detail.getQrToken());
            item.put("ticketUsed", detail.getTicketUsed() != null ? detail.getTicketUsed() : false);
            item.put("qrCodeUrl", "/api/ticket/qrcode/" + detail.getOrderDetailId());
            // 如果有關聯到景點，也帶上 spotId
            if (detail.getMyMap() != null) {
                item.put("spotId", detail.getMyMap().getSpotId());
                item.put("locationName", detail.getMyMap().getLocationName());
            }
            ticketList.add(item);
        }

        return ResponseEntity.ok(ticketList);
    }
}
