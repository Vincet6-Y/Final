package com.example.FinalWeb.controller;

//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@RequestMapping("/")
@Controller
public class MemberController {

    // @Autowired
    // private JdbcTemplate jdbcTemplate;

    @RequestMapping("/test")
    public String test() {
        // try {
        // // 我們請小弟去執行一句最廢話的 SQL：「SELECT 1」
        // // 它的邏輯是：如果 TiDB 有乖乖連上且醒著，它就一定會回傳數字 1
        // Integer dbAnswer = jdbcTemplate.queryForObject("SELECT 1", Integer.class);

        // // 如果沒報錯走到這行，我們就在下方的 Console (終端機) 印出超大聲的慶祝訊息！
        // System.out.println("=========================================");
        // System.out.println("🎉 太神啦！成功連線到 TiDB 雲端資料庫！");
        // System.out.println("📡 資料庫平安回應了數字：" + dbAnswer);
        // System.out.println("=========================================");

        // } catch (Exception e) {
        // // 如果密碼打錯、網路斷掉，就會跳到這裡，印出失敗原因
        // System.out.println("🚨 糟糕，資料庫連線失敗了！");
        // System.out.println("👉 失敗原因：" + e.getMessage());
        // }

        // 🌟 步驟三：照常把網頁端給客人
        return "backendcontentmanagement";
    }

    @RequestMapping("/login")
    public String login() {
        return "login";
    }

    @RequestMapping("/news")
    public String news() {
        return "news";
    }

    @RequestMapping("/info")
    public String info() {
        return "info";
    }

    @RequestMapping("/payment")
    public String payment() {
        return "payment";
    }

    @RequestMapping("/paymentsuccess")
    public String paymentsuccess() {
        return "paymentsuccess";
    }
}
