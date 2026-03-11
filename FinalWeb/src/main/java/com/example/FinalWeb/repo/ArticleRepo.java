package com.example.FinalWeb.repo;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import com.example.FinalWeb.entity.ArticleEntity;

@Repository
public interface ArticleRepo extends JpaRepository<ArticleEntity, Integer> {
    List<ArticleEntity> findByArticleClassOrderByArticleIdDesc(String articleClass);
}
