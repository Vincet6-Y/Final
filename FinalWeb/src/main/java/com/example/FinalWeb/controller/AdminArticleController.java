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
import org.springframework.web.servlet.ModelAndView;
import jakarta.servlet.http.HttpServletRequest;

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

        // 呼叫 Service 拿取分頁資料
        Page<ArticleEntity> articlePage = articleService.findAllPaged(page, size);

        // 回傳 HTTP 200 (OK) 與包裝好的分頁物件
        return ResponseEntity.ok(articlePage);
    }

    // ------------------------------------------------
    // 查詢單篇文章 (Read - 切換狀態用)
    // ------------------------------------------------
    @GetMapping("/{id}")
    public ResponseEntity<ArticleEntity> getById(@PathVariable Integer id) {
        ArticleEntity article = articleService.findEntityById(id);
        if (article == null) {
            return ResponseEntity.notFound().build();
        }
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
        return ResponseEntity.ok(updated); // HTTP 200
    }

    // ------------------------------------------------
    // 刪除文章 (Delete)
    // ------------------------------------------------
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        articleService.deleteArticle(id);
        return ResponseEntity.noContent().build(); // HTTP 204
    }

    // ------------------------------------------------
    // 上傳圖片 (Upload)
    // ------------------------------------------------
    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("articleClass") String articleClass,
            HttpServletRequest request) {

        try {
            // ✅ 取得專案 static 目錄的絕對路徑（開發與部署環境都適用）
            String staticPath = request.getServletContext()
                    .getRealPath("/uploads/article/" + articleClass);

            File dir = new File(staticPath);
            if (!dir.exists()) {
                dir.mkdirs();
            }

            String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
            File dest = new File(dir, fileName);
            file.transferTo(dest);

            String url = "/uploads/article/" + articleClass + "/" + fileName;
            Map<String, String> result = new HashMap<>();
            result.put("url", url);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "上傳失敗：" + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    // ------------------------------------------------
    // 後台文章預覽
    // ------------------------------------------------
    @GetMapping("/preview")
    public ModelAndView previewPage() {
        return new ModelAndView("article");
    }

}