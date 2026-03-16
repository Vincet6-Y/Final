package com.example.FinalWeb.service;

import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.example.FinalWeb.dto.ArticleDTO;
import com.example.FinalWeb.entity.ArticleEntity;
import com.example.FinalWeb.repo.ArticleRepo;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

@Slf4j // 引入 Lombok 的日誌神器，取代 System.out.println
@Service
public class ArticleService {

    @Autowired
    private ArticleRepo articleRepo;

    // ------------------------------------------------
    // 系統啟動初始化資料
    // ------------------------------------------------
    @PostConstruct
    public void initData() {
        // 安全機制：資料庫已有資料就不覆蓋，保護正式環境資料
        if (articleRepo.count() > 0) {
            log.info(">>> 資料庫已有文章，略過 JSON 初始化");
            return;
        }
        importFromJson();
    }

    /**
     * 從 resources/news.json 讀取初始文章
     */
    private void importFromJson() {
        try {
            ObjectMapper mapper = new ObjectMapper();
            InputStream jsonFile = new ClassPathResource("news.json").getInputStream();

            List<ArticleEntity> articles = mapper.readValue(
                    jsonFile, new TypeReference<List<ArticleEntity>>() {
                    });

            articleRepo.saveAll(articles);
            log.info(">>> 成功匯入 {} 篇文章", articles.size());

        } catch (Exception e) {
            log.error(">>> 匯入 JSON 失敗", e); // 將錯誤詳細資訊寫入 Log
        }
    }

    // ------------------------------------------------
    // 後台管理用 (Entity) - 處理完整資料
    // ------------------------------------------------

    /** 查全部文章 */
    public List<ArticleEntity> findAll() {
        return articleRepo.findAll();
    }

    /** 查全部文章 (分頁版) */
    public Page<ArticleEntity> findAllPaged(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "articleId"));
        return articleRepo.findAll(pageable);
    }

    /** 查單篇文章 */
    public ArticleEntity findEntityById(Integer articleId) {
        return articleRepo.findById(articleId).orElse(null);
    }

    /** 依分類查詢 */
    public List<ArticleEntity> findByCategory(String category) {
        return articleRepo.findByArticleClassOrderByArticleIdDesc(category);
    }

    /** 新增文章 */
    public ArticleEntity createArticle(ArticleEntity article) {
        return articleRepo.save(article);
    }

    /** 修改文章 (加上防呆與商業邏輯) */
    public ArticleEntity updateArticle(Integer articleId, ArticleEntity article) {
        // 先確認文章存在，確保不會改到幽靈資料
        ArticleEntity old = articleRepo.findById(articleId)
                .orElseThrow(() -> new RuntimeException("文章不存在"));

        // 只允許修改特定欄位
        old.setTitle(article.getTitle());
        old.setContent(article.getContent());
        old.setArticleClass(article.getArticleClass());

        return articleRepo.save(old);
    }

    /** 刪除文章 */
    public void deleteArticle(Integer articleId) {
        articleRepo.deleteById(articleId);
    }

    // ------------------------------------------------
    // 前端顯示用 (DTO) - 處理脫殼與格式轉換
    // ------------------------------------------------

    /** 取得單篇文章 DTO */
    public ArticleDTO findById(Integer articleId) {
        return articleRepo.findById(articleId)
                .map(ArticleDTO::new)
                .orElse(null);
    }

    /**
     * 取得全部文章（DTO）
     * 優化：使用 Sort.by 交給底層資料庫排序，節省 Java 記憶體
     */
    public List<ArticleDTO> getAllArticles() {
        return articleRepo.findAll(Sort.by(Sort.Direction.DESC, "articleId"))
                .stream()
                .map(ArticleDTO::new)
                .collect(Collectors.toList());
    }

    /**
     * 依分類分組
     * 優化：同樣交給資料庫排序，再進行 Map 分類
     */
    public Map<String, List<ArticleDTO>> getAllArticlesGrouped() {
        return articleRepo.findAll(Sort.by(Sort.Direction.DESC, "articleId"))
                .stream()
                .map(ArticleDTO::new) // 將 Entity 轉成乾淨的 DTO
                .collect(Collectors.groupingBy(ArticleDTO::getArticleClass));
    }
}