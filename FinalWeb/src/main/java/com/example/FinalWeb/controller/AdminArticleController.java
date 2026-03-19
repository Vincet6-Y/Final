package com.example.FinalWeb.controller;

import java.util.HashMap;
import java.util.Map;
import java.io.File;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.example.FinalWeb.entity.ArticleEntity;
import com.example.FinalWeb.service.ArticleService;

@RestController
@RequestMapping("/admin/articles")
public class AdminArticleController {

    @Autowired
    private ArticleService articleService;

    // ------------------------------------------------
    // 1. 取得所有文章 (Read - 支援分頁)
    // ------------------------------------------------
    @GetMapping
    public ResponseEntity<Page<ArticleEntity>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        // 呼叫 Service 拿取分頁資料
        Page<ArticleEntity> articlePage = articleService.findAllPaged(page, size);

        // 回傳 HTTP 200 (OK) 與包裝好的分頁物件
        return ResponseEntity.ok(articlePage);
    }

    // ------------------------------------------------
    // 2. 新增文章 (Create)
    // ------------------------------------------------
    @PostMapping
    public ResponseEntity<ArticleEntity> create(@RequestBody ArticleEntity article) {

        article.setStatus("published");

        ArticleEntity saved = articleService.createArticle(article);

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // ------------------------------------------------
    // 3. 修改文章 (Update)
    // ------------------------------------------------
    @PutMapping("/{id}")
    public ResponseEntity<ArticleEntity> update(@PathVariable Integer id,
            @RequestBody ArticleEntity article) {
        ArticleEntity updated = articleService.updateArticle(id, article);
        return ResponseEntity.ok(updated); // HTTP 200
    }

    // ------------------------------------------------
    // 4. 刪除文章 (Delete)
    // ------------------------------------------------
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        articleService.deleteArticle(id);
        return ResponseEntity.noContent().build(); // HTTP 204
    }

    @PostMapping("/upload")
    public Map<String, String> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("articleClass") String articleClass) throws Exception {

        String uploadDir = "src/main/resources/static/uploads/article/" + articleClass + "/";
        File dir = new File(uploadDir);
        if (!dir.exists()) {
            dir.mkdirs();
        }
        String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        File dest = new File(uploadDir + fileName);
        file.transferTo(dest);
        String url = "/uploads/article/" + articleClass + "/" + fileName;
        Map<String, String> result = new HashMap<>();
        result.put("url", url);
        return result;
    }
}