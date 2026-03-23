package com.example.FinalWeb.controller;

import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import com.example.FinalWeb.dto.PlanCreateRequestDTO;
import com.example.FinalWeb.dto.WorkDTO;
import com.example.FinalWeb.entity.JourneyPlanEntity;
import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.entity.OrdersEntity;
import com.example.FinalWeb.entity.WorkDetailEntity;
import com.example.FinalWeb.service.JourneyPlanService;
import com.example.FinalWeb.service.WorkService;
import com.example.FinalWeb.service.AdminOrderService;
import com.example.FinalWeb.service.ArticleService;
import com.example.FinalWeb.entity.ArticleEntity;
import org.springframework.data.domain.Page;

import jakarta.servlet.http.HttpSession;

@Controller
@RequestMapping("/backend")
public class BackEndController {

    @Autowired
    private WorkService service;

    @Autowired
    private JourneyPlanService journeyPlanService;

    @Autowired
    private ArticleService articleService;

    @Autowired
    private AdminOrderService adminOrderService;

    @Value("${google.maps.api.key}")
    private String googleMapsApiKey;

    @RequestMapping("/home")
    public String backendhome() {
        return "/backend/backendhome";
    }

    @RequestMapping("/order")
    public String backendorder(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "全部") String status,
            Model model) {

        Page<OrdersEntity> ordersPage = adminOrderService.getOrdersPaged(status, page, size);
        model.addAttribute("ordersPage", ordersPage);
        model.addAttribute("currentStatus", status);

        Map<String, Object> stats = adminOrderService.getAdminDashboardStats();
        model.addAttribute("stats", stats);

        return "/backend/backendorder";
    }

    @RequestMapping("/operation")
    public String backendoperation() {
        return "/backend/backendoperation";
    }

    @RequestMapping("/contentmanagement")
    public String backendcontentmanagement(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            Model model, HttpSession session) {
        List<WorkDetailEntity> getNew5 = service.showNew5();
        model.addAttribute("newWroks", getNew5);

        // 1. 取得所有的行程 (供彈窗內的「全部、5日、10日」分類使用)
        List<JourneyPlanEntity> allPlans = journeyPlanService.showLatestPlans();
        model.addAttribute("allPlans", allPlans);

        // 2. 利用 Stream 只取前 5 筆給主畫面預覽 (避免主畫面太長)
        List<JourneyPlanEntity> top5Plans = allPlans.stream().limit(5).collect(Collectors.toList());
        model.addAttribute("journeyPlans", top5Plans);

        // 3. 取得文章分頁資料
        Page<ArticleEntity> articlesPage = articleService.findAllPaged(page, size);
        model.addAttribute("articlesPage", articlesPage);

        // 4. 取得登入會員名稱，顯示在文章管理表格的「作者」欄
        Object memberObj = session.getAttribute("loginMember");
        if (memberObj instanceof MemberEntity) {
            model.addAttribute("loginMemberName",
                    ((MemberEntity) memberObj).getName());
        } else {
            model.addAttribute("loginMemberName", "管理員");
        }

        return "/backend/backendcontentmanagement";
    }

    // 【新增】處理切換上下架狀態的 AJAX 請求
    @PostMapping("/contentmanagement/plan/toggleStatus")
    @ResponseBody
    public ResponseEntity<?> togglePlanStatus(@RequestParam("planId") Integer planId,
            @RequestParam("status") Boolean status) {
        try {
            // 呼叫 Service 更新資料庫狀態 (需自行在 Service 實作)
            journeyPlanService.updateStatus(planId, status);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).body("更新失敗");
        }
    }

    // 【新增】處理批次上下架狀態的 AJAX 請求
    @PostMapping("/contentmanagement/plan/batchToggleStatus")
    @ResponseBody
    public ResponseEntity<?> batchTogglePlanStatus(
            @RequestParam(value = "planIds[]") List<Integer> planIds,
            @RequestParam("status") Boolean status) {
        try {
            journeyPlanService.batchUpdateStatus(planIds, status);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).body("批次更新失敗");
        }
    }

    // ==========================================
    // 新增行程套裝 (GET: 顯示表單頁面)
    // ==========================================
    @GetMapping("/contentmanagement/plan/create")
    public String createPlanForm(Model model) {
        // 取得所有作品供下拉選單使用
        List<WorkDetailEntity> allWorks = service.getWork();
        model.addAttribute("works", allWorks);

        // 【新增】將 API Key 傳給前端 Thymeleaf 模板
        model.addAttribute("apiKey", googleMapsApiKey);

        return "/backend/backendplancreate";
    }

    // ==========================================
    // 新增行程套裝 (POST: 接收複雜 JSON 表單並儲存)
    // ==========================================
    @PostMapping("/contentmanagement/plan/create")
    @ResponseBody // 改為回傳 JSON 狀態，讓前端 AJAX 處理跳轉
    public ResponseEntity<?> createPlanSubmit(@RequestBody PlanCreateRequestDTO requestDto) {
        try {
            // 呼叫 Service 執行儲存
            journeyPlanService.createNewPlanWithSpots(requestDto);
            return ResponseEntity.ok().body("{\"success\": true}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("{\"success\": false, \"message\": \"儲存失敗\"}");
        }
    }

    // ==========================================
    // 編輯行程套裝 (GET: 顯示編輯表單頁面)
    // ==========================================
    @GetMapping("/contentmanagement/plan/edit")
    public String editPlanForm(@RequestParam("planId") Integer planId, Model model) {
        // 1. 準備下拉選單的作品與 API Key
        List<WorkDetailEntity> allWorks = service.getWork();
        model.addAttribute("works", allWorks);
        model.addAttribute("apiKey", googleMapsApiKey);

        // 2. 撈出這筆行程的舊資料，傳給前端 Thymeleaf
        JourneyPlanEntity plan = journeyPlanService.getPlanById(planId);
        model.addAttribute("plan", plan);

        // backendplanedit.html 來處理編輯邏輯
        return "/backend/backendplanedit";
    }

    // ==========================================
    // 編輯行程套裝 (POST: 接收更新資料)
    // ==========================================
    @PostMapping("/contentmanagement/plan/update/{planId}")
    @ResponseBody
    public ResponseEntity<?> updatePlanSubmit(@PathVariable Integer planId,
            @RequestBody PlanCreateRequestDTO requestDto) {
        try {
            journeyPlanService.updatePlanWithSpots(planId, requestDto);
            return ResponseEntity.ok().body("{\"success\": true}");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("{\"success\": false, \"message\": \"更新失敗\"}");
        }
    }

    @RequestMapping("/backendarticle")
    public String backendarticle() {
        return "/backend/backendarticle";
    }

    // 作品列表相關
    @RequestMapping("/contentmanagement/work")
    public String backendwork() {

        return "/backend/backendworkmanagement";
    }

    @PostMapping("/contentmanagement/work/add")
    public String workupload(WorkDTO wDto) {
        service.addwork(wDto);

        return "redirect:/backend/contentmanagement/work";
    }

    @RequestMapping("/contentmanagement/work/list")
    public String worklist(Model model,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<WorkDetailEntity> workPage = service.getBackendWorklist(page, size);

        model.addAttribute("works", workPage);
        model.addAttribute("page", page);

        return "/backend/backendworklist";
    }

    @GetMapping("/contentmanagement/work/edit")
    public String workedit(Model model,
            WorkDTO wDto) {
        Optional<WorkDetailEntity> getWorkBox = service.findWork(wDto);
        WorkDetailEntity getWork = getWorkBox.orElse(null);
        model.addAttribute("getWork", getWork);

        return "/backend/backendworkedit";
    }

    @PostMapping("/contentmanagement/work/update")
    public String workupdate(WorkDTO wDto, RedirectAttributes redirectAttributes) {
        service.updateWork(wDto);
        redirectAttributes.addFlashAttribute("message", "更新成功！");

        return "redirect:/backend/contentmanagement/work/edit" + "?workId=" + wDto.workId();
    }
}
