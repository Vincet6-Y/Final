package com.example.FinalWeb.repo;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.FinalWeb.entity.MemberOauthEntity;
import com.example.FinalWeb.enums.AuthProvider;

public interface MemberOauthRepo extends JpaRepository<MemberOauthEntity, Integer> {
    // 依第三方登入來源 + 第三方平台使用者ID 查詢綁定資料
    Optional<MemberOauthEntity> findByProviderAndProviderId(AuthProvider provider, String providerId);

    // 檢查某個第三方帳號是否已被綁定
    boolean existsByProviderAndProviderId(AuthProvider provider, String providerId);

    // 檢查指定會員是否已綁定某個第三方登入來源
    boolean existsByMember_MemberIdAndProvider(Integer memberId, AuthProvider provider);
    
    // 查詢指定會員在某個第三方登入來源的綁定資料
    Optional<MemberOauthEntity> findByMember_MemberIdAndProvider(Integer memberId, AuthProvider provider);
    
    // 刪除指定會員的某個第三方登入綁定資料
    void deleteByMember_MemberIdAndProvider(Integer memberId, AuthProvider provider);

}
