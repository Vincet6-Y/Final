package com.example.FinalWeb.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import com.example.FinalWeb.entity.ArticleEntity;
import com.example.FinalWeb.service.ArticleService;

@Controller
@RequestMapping("/news")
public class ArticleWebController {

    @Autowired
    private ArticleService articleService;

    // 1. 最新消息首頁 (列表頁)
    @GetMapping
    public String showNewsHome(Model model) {
        // 撈取所有文章給首頁的「旅遊攻略」區塊用
        model.addAttribute("articles", articleService.findAll());
        return "news"; // 你的最新消息首頁 HTML 檔名
    }

    // 2. 文章詳細頁 (公版頁)
    @GetMapping("/article/{id}")
    public String showArticleDetail(@PathVariable Integer id, Model model) {
        ArticleEntity article = articleService.findById(id);
        if (article == null)
            return "redirect:/news"; // 防錯機制

        model.addAttribute("article", article);
        return "article"; // 你的公版 HTML 檔名
    }
}
