package com.example.FinalWeb.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.FinalWeb.entity.MyMapEntity;

@Repository
public interface MyMapRepo extends JpaRepository<MyMapEntity, Integer> {
}
