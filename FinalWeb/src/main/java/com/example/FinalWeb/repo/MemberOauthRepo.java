package com.example.FinalWeb.repo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.FinalWeb.entity.MemberOauthEntity;

public interface MemberOauthRepo extends JpaRepository<MemberOauthEntity, Integer> {
    // 依第三方登入來源 + 第三方平台使用者ID 查詢綁定資料
    Optional<MemberOauthEntity> findByProviderAndProviderId(String provider, String providerId);

}
