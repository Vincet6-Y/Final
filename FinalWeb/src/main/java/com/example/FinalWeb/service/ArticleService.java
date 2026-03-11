package com.example.FinalWeb.service;

import java.io.InputStream;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.stream.Collectors;

import com.example.FinalWeb.dto.ArticleDTO;
import com.example.FinalWeb.entity.ArticleEntity;
import com.example.FinalWeb.repo.ArticleRepo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

import jakarta.annotation.PostConstruct;

@Service
public class ArticleService {

    @Autowired
    private ArticleRepo articleRepo;

    @PostConstruct
    public void initData() {
        try {
            // 關鍵修改：先檢查資料庫有沒有東西
            long count = articleRepo.count();
            if (count == 0) {
                System.out.println(">>> [ArticleService] 偵測到資料庫為空，開始匯入初始 JSON 資料...");
                importFromJson();
            } else {
                // 如果已經有資料，就不執行 truncate 和 import
                System.out.println(">>> [ArticleService] 資料庫已有 " + count + " 筆資料，跳過初始化。");
            }
        } catch (Exception e) {
            System.err.println(">>> [ArticleService] 初始化失敗：" + e.getMessage());
        }
    }

    /**
     * 思考邏輯：將 JSON 解析與資料保存邏輯獨立出來，結構更清晰。
     */
    private void importFromJson() {
        try {
            ObjectMapper mapper = new ObjectMapper();
            // 使用 ClassPathResource 讀取資源檔案
            InputStream jsonFile = new ClassPathResource("news.json").getInputStream();
            List<ArticleEntity> articles = mapper.readValue(jsonFile, new TypeReference<List<ArticleEntity>>() {
            });

            // 保存所有文章，此時資料庫會從 ID 1 開始分配
            articleRepo.saveAll(articles);
            System.out.println(">>> [ArticleService] 成功匯入 " + articles.size() + " 篇文章！");

        } catch (Exception e) {
            e.printStackTrace();
            System.err.println(">>> [ArticleService] 匯入失敗：" + e.getMessage());
        }
    }

    // --- 以下為查詢邏輯 ---

    // 根據 ID 拿資料
    // public ArticleEntity findById(Integer articleId) {
    // return articleRepo.findById(articleId).orElse(null);
    // }

    // 分頁或單一分類頁面備用
    public List<ArticleEntity> findByCategory(String category) {
        return articleRepo.findByArticleClassOrderByArticleIdDesc(category);
    }

    // --- 高階查詢 ---
    // --- 將 Entity 轉為 DTO ---
    public Map<String, List<ArticleDTO>> getAllArticlesGrouped() {
        return articleRepo.findAll().stream()
                .sorted((a1, a2) -> a2.getArticleId().compareTo(a1.getArticleId()))
                .map(ArticleDTO::new) // 關鍵：在這裡進行「脫殼」處理
                .collect(Collectors.groupingBy(ArticleDTO::getArticleClass));
    }

    public ArticleDTO findById(Integer articleId) {
        return articleRepo.findById(articleId).map(ArticleDTO::new).orElse(null);
    }

    // 「後端管理列表（不分分類顯示所有文章）
    public List<ArticleEntity> findAll() {
        return articleRepo.findAll();
    }

}