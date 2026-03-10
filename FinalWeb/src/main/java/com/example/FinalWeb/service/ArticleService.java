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
     * 參考 https://docs.oracle.com/javase/8/docs/api/ 關於 PostConstruct 的生命週期。
     */
    @PostConstruct
    public void initData() {
        // 1. 檢查資料庫筆數：這是為了配合你手動 TRUNCATE 指令。
        // 當你清空資料表，count 就會是 0，從而觸發重新匯入 JSON 裡的指定 ID。
        if (articleRepo.count() == 0) {
            System.out.println(">>> [ArticleService] 檢測到資料庫為空，開始從 JSON 指定 ID 匯入資料...");
            importFromJson();
        } else {
            System.out.println(">>> [ArticleService] 資料庫已有 " + articleRepo.count() + " 筆資料，跳過自動匯入。");
        }
    }

    /**
     * 思考邏輯：將 JSON 解析與資料保存邏輯獨立出來，結構更清晰。
     */
    private void importFromJson() {
        try {
            // 2. 建立 ObjectMapper：Jackson 核心工具，負責 JSON 與 Java 物件的轉換。
            ObjectMapper mapper = new ObjectMapper();

            // 3. 讀取資源：使用 ClassPathResource 確保打包成 JAR 後依然能讀到檔案。
            InputStream jsonFile = new ClassPathResource("articles.json").getInputStream();

            // 4. 反序列化：利用 TypeReference 處理 List 泛型丟失問題。
            // 這裡 JSON 裡的 "articleId": 1 會透過 Jackson 自動塞入 ArticleEntity 的 articleId 欄位。
            List<ArticleEntity> articles = mapper.readValue(jsonFile, new TypeReference<List<ArticleEntity>>() {
            });

            // 5. 存入資料庫：因為資料庫剛清空，ID 計數器歸零，它會優先接受 JSON 裡的 1, 2, 3, 4。
            articleRepo.saveAll(articles);
            System.out.println(">>> [ArticleService] 成功匯入 " + articles.size() + " 篇指定 ID 的文章！");

        } catch (Exception e) {
            // 萬一 JSON 格式寫錯（例如少了逗號），這裡會抓到具體錯誤訊息。
            System.err.println(">>> [ArticleService] 匯入失敗，請檢查 articles.json 格式：" + e.getMessage());
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