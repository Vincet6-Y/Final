package com.example.FinalWeb.dto;

import com.example.FinalWeb.entity.ArticleEntity;

import lombok.Data;

@Data
public class ArticleDTO {
    private Integer articleId;
    private String articleClass;
    private String title;
    private String content; // 原始內容 (詳細頁用)
    private String purePreview; // 去掉符號的簡介 (列表卡片用)
    private String articleImageUrl; // 封面圖路徑

    public ArticleDTO(ArticleEntity entity) {
        this.articleId = entity.getArticleId();
        this.articleClass = entity.getArticleClass();
        this.title = entity.getTitle();
        this.content = entity.getContent();
        this.articleImageUrl = entity.getArticleImageUrl();
        this.purePreview = generatePreview(entity.getContent());
    }

    // 核心邏輯：清洗 Markdown 與 HTML 標籤，讓卡片顯示純文字
    private String generatePreview(String content) {
        if (content == null) {
            return "";
        }
        String clean = content
                .replaceAll("<[^>]*>", "") // 清除 HTML 標籤
                .replaceAll("[#*>`\\-]", "") // 為了相容避免之前的 markdown 標記漏網之魚
                .replaceAll("\\n+", " ") // 換行變空格
                .replaceAll("\\s{2,}", " ")
                .trim();
        return clean.length() > 65 ? clean.substring(0, 65) + "..." : clean;
    }
}