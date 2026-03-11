package com.example.FinalWeb.controller;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import com.example.FinalWeb.dto.ArticleDTO;
import com.example.FinalWeb.service.ArticleService;

@Controller
@RequestMapping("/")
public class ArticleWebController {

    @Autowired
    private ArticleService articleService;

    // 最新消息首頁 (列表頁)
    @GetMapping("/news")
    public String showNews(Model model) {
        // 1. 拿到已經分類並排好序的 Map
        Map<String, List<ArticleDTO>> grouped = articleService.getAllArticlesGrouped();

        // 2. 網站情報區：手動組合這三個分類，並限制前 3 筆
        List<ArticleDTO> newSection = new ArrayList<>();
        newSection.addAll(grouped.getOrDefault("活動", Collections.emptyList()));
        newSection.addAll(grouped.getOrDefault("會員限定", Collections.emptyList()));
        newSection.addAll(grouped.getOrDefault("比賽", Collections.emptyList()));
        model.addAttribute("newSection", newSection.stream().limit(3).collect(Collectors.toList()));

        // 3. 旅遊攻略區：把所有相關的攻略分類「合併」在一起
        List<ArticleDTO> travelGuides = new ArrayList<>();
        travelGuides.addAll(grouped.getOrDefault("日本聖地獨旅", Collections.emptyList()));
        travelGuides.addAll(grouped.getOrDefault("朝聖地指南", Collections.emptyList()));
        travelGuides.addAll(grouped.getOrDefault("裝備推薦", Collections.emptyList()));
        travelGuides.addAll(grouped.getOrDefault("聖地美食", Collections.emptyList()));
        model.addAttribute("travelGuides", travelGuides);

        return "news";
    }

    // 文章詳細頁 (公版頁)
    @GetMapping("/article/{id}")
    public String showArticleDetail(@PathVariable Integer id, Model model) {
        ArticleDTO article = articleService.findById(id);
        if (article == null)
            return "redirect:/news"; // 防錯機制
        model.addAttribute("article", article);
        return "article"; // 你的公版 HTML 檔名
    }
}
