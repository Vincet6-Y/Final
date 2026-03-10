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

    // 思考邏輯：
    // 1. @Modifying：代表這是一個 DML/DDL 操作（新增、修改、刪除）。
    // 2. @Transactional：這類操作必須在事務中執行，否則會噴錯。
    // 3. nativeQuery = true：TRUNCATE 是 MySQL 特有指令，必須用原生 SQL 執行。
    @Modifying
    @Transactional
    @Query(value = "TRUNCATE TABLE article", nativeQuery = true)
    void truncateTable();
}
