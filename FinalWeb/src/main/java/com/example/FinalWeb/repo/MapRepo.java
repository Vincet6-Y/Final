package com.example.FinalWeb.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.FinalWeb.entity.MapEntity;

@Repository
public interface MapRepo extends JpaRepository<MapEntity, Integer> {
}
