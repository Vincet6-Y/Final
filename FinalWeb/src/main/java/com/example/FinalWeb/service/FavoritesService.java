package com.example.FinalWeb.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.FinalWeb.entity.FavoritesEntity;
import com.example.FinalWeb.repo.FavoritesRepo;

@Service
public class FavoritesService {

    @Autowired
    private FavoritesRepo favoritesRepo;

    // 🌟 給會員首頁用的：取得會員的收藏清單 (由新到舊)
    public List<FavoritesEntity> getMemberFavorites(Integer memberId) {
        // 這裡未來可以擴充很多邏輯，目前先單純回傳 Repo 撈出來的資料
        return favoritesRepo.findByMember_MemberIdOrderByIdDesc(memberId);
    }

}