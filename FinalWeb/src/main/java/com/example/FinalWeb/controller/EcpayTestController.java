package com.example.FinalWeb.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;

import com.example.FinalWeb.entity.JourneyPlanEntity;
import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.entity.MyPlanEntity;
import com.example.FinalWeb.entity.OrdersEntity;
import com.example.FinalWeb.entity.WorkDetailEntity;
import com.example.FinalWeb.repo.JourneyPlanRepo;
import com.example.FinalWeb.repo.MemberRepo;
import com.example.FinalWeb.repo.MyPlanRepo;
import com.example.FinalWeb.repo.OrdersRepo;
import com.example.FinalWeb.repo.WorkDetailRepo;

@Controller
public class EcpayTestController {

    @Autowired
    private OrdersRepo ordersRepo;

    @Autowired
    private MemberRepo memberRepo;

    @Autowired
    private MyPlanRepo myPlanRepo;

    @Autowired
    private JourneyPlanRepo journeyPlanRepo;

    @Autowired
    private WorkDetailRepo workDetailRepo;

    // 綠界測試用支付
    @RequestMapping("/payment")
    // public String payment(@RequestParam(required = false) Integer orderId, Model
    // model) {
    // // 真實的情境下，可能是由購物車那邊建立好訂單，並將 orderId 帶過來
    // if (orderId != null) {
    // ordersRepo.findById(orderId).ifPresent(order -> model.addAttribute("order",
    // order));
    // }
    // return "payMent";
    // }

    // @RequestMapping("/testpayment")
    public String testPayment(Model model) {
        // [測試用] 先確定資料庫中有一名測試會員避免 foreign key 衝突
        MemberEntity member = memberRepo.findById(1).orElseGet(() -> {
            MemberEntity newMem = new MemberEntity();
            newMem.setName("測試會員");
            newMem.setEmail("test@example.com");
            newMem.setPasswd("testpass");
            newMem.setPhone("0912345678");
            newMem.setRole("user");
            newMem.setBirthday(java.time.LocalDate.of(1990, 1, 1));
            return memberRepo.save(newMem);
        });

        // [測試用] 先確定有一筆假職務明細避免 foreign key 衝突
        WorkDetailEntity workDetail = workDetailRepo.findById(1).orElseGet(() -> {
            WorkDetailEntity work = new WorkDetailEntity();
            work.setWorkName("測試職業");
            work.setOnDate(java.time.LocalDate.now());
            work.setWorkClass("IT");
            work.setWorkImg("test.png");
            return workDetailRepo.save(work);
        });

        // [測試用] 先確定有一筆假行程方案避免 foreign key 衝突
        JourneyPlanEntity journeyPlan = journeyPlanRepo.findById(1).orElseGet(() -> {
            JourneyPlanEntity jp = new JourneyPlanEntity();
            jp.setPlanName("測試用方案");
            jp.setDaysCount(5);
            jp.setWorkDetail(workDetail);
            return journeyPlanRepo.save(jp);
        });

        // [測試用] 先確定有一筆假行程計畫避免 myPlanId foreign key 衝突
        MyPlanEntity myPlan = myPlanRepo.findById(1).orElseGet(() -> {
            MyPlanEntity plan = new MyPlanEntity();
            plan.setMyPlanName("測試用日本行程");
            plan.setStartDate(java.time.LocalDate.now().plusDays(3));
            plan.setMember(member);
            plan.setJourneyPlan(journeyPlan); // 避免 Column 'planId' cannot be null 的錯誤
            return myPlanRepo.save(plan);
        });

        // [測試用] 進入結帳頁面前，我們先在資料庫塞一筆假訂單
        OrdersEntity dummyOrder = new OrdersEntity();
        dummyOrder.setTotal(3200); // 測試假金額
        dummyOrder.setPayStatus("未付款");
        dummyOrder.setOrderTime(java.time.LocalDateTime.now());

        // 將訂單綁定這名會員及行程，避免 Column cannot be null 的錯誤
        dummyOrder.setMember(member);
        dummyOrder.setMyPlan(myPlan);

        // 儲存後 dummyOrder 會產生屬於它的 orderId
        ordersRepo.save(dummyOrder);

        // 把這筆帶有真實 orderId 的訂單送到前端 payMent.html
        model.addAttribute("order", dummyOrder);

        // 注意：您的前端檔案名稱叫 payMent.html，建議字尾與原檔名大小寫一致
        return "payMent";
    }
}
