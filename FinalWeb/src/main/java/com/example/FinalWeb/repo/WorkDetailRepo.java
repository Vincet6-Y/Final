package com.example.FinalWeb.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.FinalWeb.entity.WorkDetailEntity;

@Repository
public interface WorkDetailRepo extends JpaRepository<WorkDetailEntity, Integer> {
}
