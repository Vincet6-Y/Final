package com.example.FinalWeb.config;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;

// @Component 這個標籤非常重要！它負責告訴 Spring Boot：「這是一個需要被管理的元件，請自動幫我把它註冊到系統中。」
@Component
public class CoopHeaderFilter implements Filter{
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        // 第一步：轉換身分
        // 系統傳進來的 response 是最原始的型態，我們必須把它「轉型」成處理網頁專用的 HttpServletResponse，才能操作 HTTP 標頭
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // 第二步：強制貼上貼紙 (設定 Headers)
        // 🌟 這裡就是核心！不管使用者要的是 HTML、JS 還是圖片，通通強制加上允許彈出視窗的 COOP 政策
        httpResponse.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");

        // 第三步：開門放行
        // 保全安檢完畢，這行程式碼代表「把資料交給下一個人處理」或是「送出給瀏覽器」
        chain.doFilter(request, response);
    }
}
