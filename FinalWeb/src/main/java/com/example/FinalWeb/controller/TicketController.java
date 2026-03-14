package com.example.FinalWeb.controller;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

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

@RestController
@RequestMapping("/api/ticket")
public class TicketController {

    @Autowired
    private OrdersDetailRepo ordersDetailRepo;

    /**
     * 🌟 共用方法：檢查並確保票券擁有 QR Token
     * 思考邏輯：把重複的三行程式碼包裝起來，讓主要 API 更乾淨易讀。
     */
    private void ensureQrTokenExists(OrdersDetailEntity detail) {
        if (detail.getQrToken() == null || detail.getQrToken().isEmpty()) {
            detail.setQrToken(UUID.randomUUID().toString());
            ordersDetailRepo.save(detail); // 更新進資料庫
        }
    }

    /**
     * ✅ API 1: 取得指定票券的 QR Code 圖片 (PNG)
     */
    @GetMapping(value = "/qrcode/{orderDetailId}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getQrCode(@PathVariable Integer orderDetailId) {
        try {
            OrdersDetailEntity detail = ordersDetailRepo.findById(orderDetailId).orElse(null);
            if (detail == null) {
                return ResponseEntity.notFound().build();
            }

            // 呼叫共用方法，確保 Token 存在
            ensureQrTokenExists(detail);

            String verifyUrl = "/api/ticket/verify/" + detail.getQrToken();

            QRCodeWriter qrWriter = new QRCodeWriter();
            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
            hints.put(EncodeHintType.MARGIN, 2);

            BitMatrix bitMatrix = qrWriter.encode(verifyUrl, BarcodeFormat.QR_CODE, 300, 300, hints);
            BufferedImage image = MatrixToImageWriter.toBufferedImage(bitMatrix);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "png", baos);
            byte[] imageBytes = baos.toByteArray();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_PNG);
            headers.setCacheControl("max-age=86400");

            return new ResponseEntity<>(imageBytes, headers, HttpStatus.OK);

        } catch (Exception e) {
            System.err.println("QR Code 生成失敗: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * ✅ API 2: 取得指定票券的 JSON 資訊 (給 jQuery AJAX 用)
     */
    @GetMapping("/info/{orderDetailId}")
    public ResponseEntity<?> getTicketInfo(@PathVariable Integer orderDetailId) {
        OrdersDetailEntity detail = ordersDetailRepo.findById(orderDetailId).orElse(null);

        if (detail == null) {
            return ResponseEntity.notFound().build();
        }

        // 呼叫共用方法
        ensureQrTokenExists(detail);

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
     * (這支 API 邏輯已經寫得很好了，保持原樣)
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

        // 🌟 改良點：直接用 Repo 新方法，讓資料庫(SQL)去篩選資料，不要撈出整張表！
        List<OrdersDetailEntity> details = ordersDetailRepo.findByOrders_OrderId(orderId);

        List<Map<String, Object>> ticketList = new ArrayList<>();

        for (OrdersDetailEntity detail : details) {
            // 呼叫共用方法
            ensureQrTokenExists(detail);

            Map<String, Object> item = new HashMap<>();
            item.put("orderDetailId", detail.getOrderDetailId());
            item.put("ticketType", detail.getTicketType());
            item.put("ticketPrice", detail.getTicketPrice());
            item.put("qrToken", detail.getQrToken());
            item.put("ticketUsed", detail.getTicketUsed() != null ? detail.getTicketUsed() : false);
            item.put("qrCodeUrl", "/api/ticket/qrcode/" + detail.getOrderDetailId());

            if (detail.getMyMap() != null) {
                item.put("spotId", detail.getMyMap().getSpotId());
                item.put("locationName", detail.getMyMap().getLocationName());
            }
            ticketList.add(item);
        }

        return ResponseEntity.ok(ticketList);
    }
}