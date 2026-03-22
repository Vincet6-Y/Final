package com.example.FinalWeb.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "article")
@Data
public class ArticleEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer articleId;

    private String articleClass;
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    // 新增欄位 文章圖片、狀態、瀏覽數、建立時間、更新時間
    private String articleImageUrl;
    private String status;
    private Integer viewCount = 0;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;

}
