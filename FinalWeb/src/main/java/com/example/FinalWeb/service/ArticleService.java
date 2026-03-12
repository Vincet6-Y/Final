package com.example.FinalWeb.service;

import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import com.example.FinalWeb.dto.ArticleDTO;
import com.example.FinalWeb.entity.ArticleEntity;
import com.example.FinalWeb.repo.ArticleRepo;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.annotation.PostConstruct;

@Service
public class ArticleService {

    @Autowired
    private ArticleRepo articleRepo;

    // -------------------------------
    // 初始化資料（第一次啟動自動匯入 JSON）
    // -------------------------------
    @PostConstruct
    public void initData() {
        try {
            long count = articleRepo.count();
            if (count == 0) {
                System.out.println(">>> [ArticleService] 資料庫為空，開始匯入初始 JSON 資料...");
                importFromJson();
            } else {
                System.out.println(">>> [ArticleService] 資料庫已有 " + count + " 筆資料，跳過初始化。");
            }
        } catch (Exception e) {
            System.err.println(">>> [ArticleService] 初始化失敗：" + e.getMessage());
        }
    }

    /**
     * 從 resources/news.json 讀取初始文章
     * JSON → ArticleEntity → 資料庫
     */
    private void importFromJson() {
        try {
            ObjectMapper mapper = new ObjectMapper();
            InputStream jsonFile = new ClassPathResource("news.json").getInputStream();
            List<ArticleEntity> articles = mapper.readValue(
                    jsonFile, new TypeReference<List<ArticleEntity>>() {
                    });
            articleRepo.saveAll(articles); // 自動分配 articleId
            System.out.println(">>> [ArticleService] 成功匯入 " + articles.size() + " 篇文章！");
        } catch (Exception e) {
            e.printStackTrace();
            System.err.println(">>> [ArticleService] 匯入失敗：" + e.getMessage());
        }
    }

    // -------------------------------
    // 後台管理用方法（Entity）
    // -------------------------------

    /** 根據 ID 拿單筆文章（完整 Entity，後台管理用） */
    public ArticleEntity findEntityById(Integer articleId) {
        return articleRepo.findById(articleId).orElse(null);
    }

    /** 根據分類查詢文章列表（Entity，後台或內部使用） */
    public List<ArticleEntity> findByCategory(String category) {
        return articleRepo.findByArticleClassOrderByArticleIdDesc(category);
    }

    /** 查詢所有文章（Entity，後台管理列表用） */
    public List<ArticleEntity> findAll() {
        return articleRepo.findAll();
    }

    // -------------------------------
    // 前端使用方法（DTO）
    // -------------------------------

    /** 根據 ID 拿單篇文章（DTO，前端顯示用） */
    public ArticleDTO findById(Integer articleId) {
        return articleRepo.findById(articleId)
                .map(ArticleDTO::new) // Entity → DTO
                .orElse(null);
    }

    /**
     * 取得所有文章，並按分類分組（DTO，前端分類頁、卡片列表用）
     * key = articleClass, value = List<ArticleDTO>
     */
    public Map<String, List<ArticleDTO>> getAllArticlesGrouped() {
        return articleRepo.findAll().stream()
                .sorted((a1, a2) -> a2.getArticleId().compareTo(a1.getArticleId())) // 最新文章在前
                .map(ArticleDTO::new) // Entity → DTO（脫殼）
                .collect(Collectors.groupingBy(ArticleDTO::getArticleClass));
    }
}