package com.example.FinalWeb.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import com.example.FinalWeb.entity.ArticleEntity;
import com.example.FinalWeb.service.ArticleService;

@RestController
@RequestMapping("/admin/articles")
public class AdminArticleController {

    @Autowired
    private ArticleService articleService;

    // ------------------------------------------------
    // 取得所有文章 (Read - 支援分頁)
    // ------------------------------------------------
    @GetMapping
    public ResponseEntity<Page<ArticleEntity>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<ArticleEntity> articlePage = articleService.findAllPaged(page, size);
        return ResponseEntity.ok(articlePage);
    }

    // ------------------------------------------------
    // 查詢單篇文章
    // ------------------------------------------------
    @GetMapping("/{id}")
    public ResponseEntity<ArticleEntity> getById(@PathVariable Integer id) {
        ArticleEntity article = articleService.findEntityById(id);
        if (article == null)
            return ResponseEntity.notFound().build();
        return ResponseEntity.ok(article);
    }

    // ------------------------------------------------
    // 新增文章 (Create)
    // ------------------------------------------------
    @PostMapping
    public ResponseEntity<ArticleEntity> create(@RequestBody ArticleEntity article) {
        if (article.getStatus() == null || article.getStatus().isEmpty()) {
            article.setStatus("draft");
        }
        ArticleEntity saved = articleService.createArticle(article);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // ------------------------------------------------
    // 修改文章 (Update)
    // ------------------------------------------------
    @PutMapping("/{id}")
    public ResponseEntity<ArticleEntity> update(@PathVariable Integer id,
            @RequestBody ArticleEntity article) {
        ArticleEntity updated = articleService.updateArticle(id, article);
        return ResponseEntity.ok(updated);
    }

    // ------------------------------------------------
    // 刪除文章 (Delete)
    // ------------------------------------------------
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        articleService.deleteArticle(id);
        return ResponseEntity.noContent().build();
    }

    // ------------------------------------------------
    // 後台文章預覽
    // ------------------------------------------------
    @GetMapping("/preview")
    public ModelAndView previewPage() {
        return new ModelAndView("article");
    }
}