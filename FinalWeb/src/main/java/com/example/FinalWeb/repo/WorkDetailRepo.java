package com.example.FinalWeb.repo;

import java.time.LocalDate;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.FinalWeb.entity.WorkDetailEntity;


@Repository
public interface WorkDetailRepo extends JpaRepository<WorkDetailEntity, Integer> {
    // Page<WorkDetailEntity> findByWorkClass(String workClass, Pageable pageable);
    Page<WorkDetailEntity> findByWorkClassAndOnDateBetween(String workClass, Pageable pageable, LocalDate startYear, LocalDate endYear);
    Page<WorkDetailEntity> findByOnDateBetween(LocalDate startDate, LocalDate endDate, Pageable pageable);
}
