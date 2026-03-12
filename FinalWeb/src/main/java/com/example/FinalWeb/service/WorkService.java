package com.example.FinalWeb.service;

import java.time.LocalDate;
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

    public Page<WorkDetailEntity> getWorkList(int page, int size, String sortDir, String workClass, String minYear, String maxYear) {
        // 日期相關
        LocalDate startYear = LocalDate.parse(minYear + "-01-01");
        LocalDate endYear = LocalDate.parse(maxYear + "-12-31");

        // 排序用
        Sort.Direction direction = sortDir.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
        Sort sort = Sort.by(direction, "onDate");

        // 分頁功能
        Pageable pageable = PageRequest.of(page, size, sort);

        if (workClass != null && !workClass.isEmpty()) {
            return repo.findByWorkClassAndOnDateBetween(workClass, pageable, startYear, endYear);
        } else {
            // Page<WorkDetailEntity> workPage = repo.findAll(pageable);
            return repo.findByOnDateBetween(startYear, endYear, pageable);
        }
    }

    // Detail 使用
    public WorkDetailEntity getWorkId(int workId) {
        return repo.findById(workId).orElse(null);
    }

}
