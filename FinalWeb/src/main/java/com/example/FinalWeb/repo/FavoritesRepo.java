package com.example.FinalWeb.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.FinalWeb.entity.FavoritesEntity;

@Repository
public interface FavoritesRepo extends JpaRepository<FavoritesEntity, Integer> {
}
