package com.example.FinalWeb.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
 
import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.entity.MemberOauthEntity;
import com.example.FinalWeb.enums.AuthProvider;
import com.example.FinalWeb.repo.MemberOauthRepo;

@Service
public class SocialAuthService {
 
    @Autowired
    private MemberOauthRepo memberOauthRepo;
 
    // 透過第三方 providerId 查找已綁定的會員
    public MemberEntity findMemberByOauth(AuthProvider provider, String providerId) {
        return memberOauthRepo
                .findByProviderAndProviderId(provider, providerId)
                .map(MemberOauthEntity::getMember)
                .orElse(null);
    }
 
    // 檢查會員是否已綁定指定的第三方帳號
    public boolean isBound(Integer memberId, AuthProvider provider) {
        return memberOauthRepo.existsByMember_MemberIdAndProvider(memberId, provider);
    }
 

    // 綁定第三方帳號到指定會員
    // 綁定前會先檢查：
    // 1. 此 providerId 是否已被其他會員綁定
    // 2. 此會員是否已綁定過同一個 provider
    // @throws IllegalStateException 任一條件不符合時拋出，附帶錯誤訊息
    @Transactional
    public void link(MemberEntity member, AuthProvider provider, String providerId) {
        MemberEntity existing = findMemberByOauth(provider, providerId);
        if (existing != null) {
            throw new IllegalStateException("此 " + provider.name() + " 帳號已綁定其他會員");
        }
 
        if (isBound(member.getMemberId(), provider)) {
            throw new IllegalStateException("此會員已綁定 " + provider.name());
        }
 
        MemberOauthEntity oauth = new MemberOauthEntity();
        oauth.setMember(member);
        oauth.setProvider(provider);
        oauth.setProviderId(providerId);
        memberOauthRepo.save(oauth);
    }
 

    // 解除指定會員的第三方帳號綁定
    // @throws IllegalStateException 尚未綁定時拋出
    @Transactional
    public void unlink(Integer memberId, AuthProvider provider) {
        if (!isBound(memberId, provider)) {
            throw new IllegalStateException("尚未綁定 " + provider.name());
        }
        memberOauthRepo.deleteByMember_MemberIdAndProvider(memberId, provider);
    }
}
