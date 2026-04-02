package com.example.FinalWeb.service;

import java.time.*;
import java.util.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.FinalWeb.entity.OrdersDetailEntity;
import com.example.FinalWeb.entity.OrdersEntity;
import com.example.FinalWeb.repo.MemberRepo;
import com.example.FinalWeb.repo.OrdersRepo;

@Service
public class AdminOrderService {

    @Autowired
    private OrdersRepo ordersRepo;

    @Autowired
    private MemberRepo memberRepo;

    @Autowired
    private OrderService orderService;

    // 取得後台數字統計
    public Map<String, Object> getAdminDashboardStats() {
        Map<String, Object> stats = new HashMap<>();

        long pendingCount = ordersRepo.countByPayStatus("待處理");
        long refundCount = ordersRepo.countByPayStatus("退款中");

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);
        long todayIssued = ordersRepo.countByPayStatusAndOrderTimeBetween("已付款", startOfDay, endOfDay);

        stats.put("pendingOrders", pendingCount);
        stats.put("refundRequests", refundCount);
        stats.put("todayIssued", todayIssued);

        return stats;
    }

    // 取得後台訂單分頁資料
    public Page<OrdersEntity> getOrdersPaged(String status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "orderTime"));

        if (status != null && !status.equals("全部") && !status.trim().isEmpty()) {
            return ordersRepo.findByPayStatus(status.trim(), pageable);
        }
        return ordersRepo.findAll(pageable);
    }

    // 修改後台訂單(更改退款與付款狀態)
    @Transactional
    public void updateOrderStatus(Integer orderId, String newStatus) {
        OrdersEntity order = orderService.getOrderById(orderId);
        order.setPayStatus(newStatus);
        ordersRepo.save(order);
    }

    // 取得後台總營收
    public long getTotalRevenue() {
        return ordersRepo.findAll().stream()
                .filter(o -> "已付款".equals(o.getPayStatus()))
                .mapToLong(o -> (long) orderService.calculateTotalAmount(o))
                .sum();
    }

    public long getTotalCount() {
        return memberRepo.count();
    }

    // 取得後台每月營收
    public List<Integer> getMonthlyRevenueForCurrentYear() {
        List<Integer> monthlyRevenue = new ArrayList<>(Collections.nCopies(12, 0));
        List<OrdersEntity> paidOrders = ordersRepo.findByPayStatusOrderByOrderTimeDesc("已付款");
        int currentYear = LocalDate.now().getYear();

        for (OrdersEntity order : paidOrders) {
            LocalDateTime timeToCheck = order.getPayTime() != null ? order.getPayTime() : order.getOrderTime();

            if (timeToCheck != null && timeToCheck.getYear() == currentYear) {
                int monthIndex = timeToCheck.getMonthValue() - 1;
                int orderTotal = orderService.calculateTotalAmount(order);
                monthlyRevenue.set(monthIndex, monthlyRevenue.get(monthIndex) + orderTotal);
            }
        }
        return monthlyRevenue;
    }

    // 取得後台每季營收
    public List<Integer> getQuarterlyRevenueForCurrentYear() {
        List<Integer> monthly = getMonthlyRevenueForCurrentYear();
        List<Integer> quarterly = new ArrayList<>();

        for (int i = 0; i < 12; i += 3) {
            quarterly.add(monthly.get(i) + monthly.get(i + 1) + monthly.get(i + 2));
        }
        return quarterly;
    }

    // 取得後台訂單明細
    public Map<String, Object> getOrderDetailWithItems(Integer orderId) {
        OrdersEntity order = ordersRepo.findById(orderId).orElse(null);
        if (order == null)
            return null;

        Map<String, Object> detail = new HashMap<>();
        detail.put("orderId", order.getOrderId());
        detail.put("payStatus", order.getPayStatus());
        detail.put("orderTime", order.getOrderTime());
        detail.put("tradeNo", order.getTradeNo());

        if (order.getMember() != null) {
            detail.put("customerName", order.getMember().getName());
            detail.put("customerEmail", order.getMember().getEmail());
        } else {
            detail.put("customerName", "未知顧客");
            detail.put("customerEmail", "未提供 Email");
        }

        detail.put("totalPrice", orderService.calculateTotalAmount(order));

        List<Map<String, Object>> items = new ArrayList<>();
        if (order.getOrderDetails() != null) {
            for (OrdersDetailEntity item : order.getOrderDetails()) {
                Map<String, Object> itemMap = new HashMap<>();
                itemMap.put("ticketType", item.getTicketType());
                itemMap.put("ticketPrice", item.getTicketPrice() != null ? item.getTicketPrice() : 0);
                items.add(itemMap);
            }
        }
        detail.put("orderDetails", items);
        return detail;
    }
}
