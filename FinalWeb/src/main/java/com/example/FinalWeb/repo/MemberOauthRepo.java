package com.example.FinalWeb.repo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.FinalWeb.entity.MemberOauthEntity;

public interface MemberOauthRepo extends JpaRepository<MemberOauthEntity, Integer> {
    // 依第三方登入來源 + 第三方平台使用者ID 查詢綁定資料
    Optional<MemberOauthEntity> findByProviderAndProviderId(String provider, String providerId);

    // 刪除指定會員的某個第三方登入綁定資料
    boolean existsByMember_MemberIdAndProvider(Integer memberId, String provider);
    
    // 查詢指定第三方登入來源與第三方使用者 ID 的綁定資料
    Optional<MemberOauthEntity> findByMember_MemberIdAndProvider(Integer memberId, String provider);
    
    // 刪除指定會員的某個第三方登入綁定資料
    void deleteByMember_MemberIdAndProvider(Integer memberId, String provider);

}
