package com.example.FinalWeb.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.FinalWeb.entity.ArticleEntity;

@Repository
public interface ArticleRepo extends JpaRepository<ArticleEntity, Integer> {
    // 依分類查詢，並按 ID 倒序（最新的在前）
    List<ArticleEntity> findByArticleClassOrderByArticleIdDesc(String articleClass);
}
