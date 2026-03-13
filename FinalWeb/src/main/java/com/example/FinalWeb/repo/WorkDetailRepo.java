package com.example.FinalWeb.repo;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.FinalWeb.entity.WorkDetailEntity;


@Repository
public interface WorkDetailRepo extends JpaRepository<WorkDetailEntity, Integer> {
    Page<WorkDetailEntity> findByWorkClass(String workClass, Pageable pageable);
    // 在你的 WorkDetailRepo 介面新增這一行
Page<WorkDetailEntity> findByWorkNameContaining(String workName, Pageable pageable);
}
