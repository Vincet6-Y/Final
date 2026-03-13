package com.example.FinalWeb.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.FinalWeb.entity.WorkDetailEntity;
import com.example.FinalWeb.service.WorkService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;


// 修正後的 SearchController.java
@RestController
@RequestMapping("/api")
public class SearchController {

    @Autowired
    private WorkService workService;

    @GetMapping("/search")
    public ResponseEntity<?> searchByKeyword(@RequestParam String keyword) {
        // 使用您在 WorkDetailRepo 建立的模糊查詢，或是寫一個找單一作品的方法
        // 這裡建議在 Service 寫一個回傳單一作品 Entity 的方法
        WorkDetailEntity work = workService.findSingleWorkByName(keyword);

        if (work != null) {
            // 回傳作品物件，前端需要裡面的 workId
            return ResponseEntity.ok(work);
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("查無此作品");
        }
    }
}