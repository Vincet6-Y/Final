package com.example.FinalWeb.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.example.FinalWeb.entity.WorkDetailEntity;
import com.example.FinalWeb.repo.WorkDetailRepo;

@Service
public class WorkService {

    @Autowired
    private WorkDetailRepo repo;

    // 抓資料
    public List<WorkDetailEntity> getWork() {

        return repo.findAll();
    }

    public Page<WorkDetailEntity> getWorkList(int page, int size) {

        Pageable pageable = PageRequest.of(page, size);
        Page<WorkDetailEntity> workPage = repo.findAll(pageable);

        return workPage;
    }

}
