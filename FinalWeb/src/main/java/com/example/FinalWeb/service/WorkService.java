package com.example.FinalWeb.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.example.FinalWeb.entity.WorkDetailEntity;
import com.example.FinalWeb.repo.WorkDetailRepo;

@Service
public class WorkService {

    @Autowired
    private WorkDetailRepo repo;

    // 抓列表資料
    public List<WorkDetailEntity> getWork() {

        return repo.findAll();
    }

    public Page<WorkDetailEntity> getWorkList(int page, int size, String sortDir, String workClass) {
        Sort.Direction direction = sortDir.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;

        Sort sort = Sort.by(direction, "onDate");

        Pageable pageable = PageRequest.of(page, size, sort);

        if (workClass != null && !workClass.isEmpty()) {
            return repo.findByWorkClass(workClass, pageable);
        } else {
            Page<WorkDetailEntity> workPage = repo.findAll(pageable);
            return workPage;
        }
    }

    // Detail 使用
    public WorkDetailEntity getWorkId(int workId) {
        return repo.findById(workId).orElse(null);
    }

    // 新增：根據關鍵字搜尋作品（支援分頁與排序）
public Page<WorkDetailEntity> searchWorkList(String keyword, int page, int size, String sortDir) {
    Sort.Direction direction = sortDir.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
    Sort sort = Sort.by(direction, "onDate");
    Pageable pageable = PageRequest.of(page, size, sort);

    // 呼叫 Repo 層的模糊查詢方法
    return repo.findByWorkNameContaining(keyword, pageable);
}
// 在 WorkService.java 新增
public WorkDetailEntity findSingleWorkByName(String keyword) {
    // 這裡可以使用 repo 搜尋，並取結果的第一筆
    List<WorkDetailEntity> results = repo.findByWorkNameContaining(keyword, PageRequest.of(0, 1)).getContent();
    return results.isEmpty() ? null : results.get(0);
}
}
