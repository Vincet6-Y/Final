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

    public ArticleDTO(ArticleEntity entity) {
        this.articleId = entity.getArticleId();
        this.articleClass = entity.getArticleClass();
        this.title = entity.getTitle();
        this.content = entity.getContent();

        // 核心邏輯：清洗 Markdown 符號，讓卡片顯示純文字
        if (entity.getContent() != null) {
            // regex 說明：去掉 #, *, >, ` 等符號
            String clean = entity.getContent().replaceAll("[#*>`\\-]", "").trim();
            this.purePreview = clean.length() > 65 ? clean.substring(0, 65) + "..." : clean;
        }
    }
}
