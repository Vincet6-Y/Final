package com.example.FinalWeb.service;

import java.io.InputStream;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import com.example.FinalWeb.entity.ArticleEntity;
import com.example.FinalWeb.repo.ArticleRepo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;

import jakarta.annotation.PostConstruct;

@Service
public class ArticleService {

    @Autowired
    private ArticleRepo articleRepo;

    /**
     * 思考邏輯：系統啟動後自動執行。
     * 因為呼叫了 truncateTable()，資料庫會被清空且 ID 計數器歸零。
     */
    @PostConstruct
    public void initData() {
        try {
            // 第一步：強制重置資料表，這會讓 Auto Increment 回到 1
            articleRepo.truncateTable();
            System.out.println(">>> [ArticleService] 資料庫已清空，ID 計數器已重置為 1");

            // 第二步：因為剛清空，count() 必定為 0，直接執行匯入
            System.out.println(">>> [ArticleService] 開始從 JSON 匯入初始資料...");
            importFromJson();

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
            InputStream jsonFile = new ClassPathResource("articles.json").getInputStream();
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

    // 根據分類拿資料 (用於 News 列表頁)
    public List<ArticleEntity> findByCategory(String category) {
        return articleRepo.findByArticleClassOrderByArticleIdDesc(category);
    }

    // 根據 ID 拿資料 (用於 Article 詳細頁)
    public ArticleEntity findById(Integer articleId) {
        // 使用 orElse(null) 處理找不到 ID 的狀況，避免 NullPointerException
        return articleRepo.findById(articleId).orElse(null);
    }

    // 拿取所有文章 (用於 News 首頁初始化顯示)
    public List<ArticleEntity> findAll() {
        return articleRepo.findAll();
    }
}