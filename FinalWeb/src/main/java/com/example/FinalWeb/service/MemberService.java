package com.example.FinalWeb.service;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.FinalWeb.dto.MemberProfileDTO;
import com.example.FinalWeb.dto.MemberRegisterDTO;
import com.example.FinalWeb.dto.PasswdChangeDto;
import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.repo.MemberRepo;
import com.example.FinalWeb.util.BCrypt;

@Service
public class MemberService {

    @Autowired
    private MemberRepo memberRepo;

    public MemberEntity login(String email, String passwd) {
        Optional<MemberEntity> memberEntity = memberRepo.findByEmail(email);
        if (memberEntity.isEmpty()) {
            return null;
        }
        MemberEntity member = memberEntity.get();
        // 用 BCrypt 比對輸入密碼與資料庫雜湊密碼
        if (!BCrypt.checkpw(passwd, member.getPasswd())) {
            return null;
        }
        return member;
    }

    public String register(MemberRegisterDTO register) {
        // 1 檢查 email 是否已存在
        if (memberRepo.existsByEmail(register.email())) {
            return "Email已註冊";
        }
        // 2 檢查密碼是否一致
        if (!register.passwd().equals(register.confirmPasswd())) {
            return "密碼不一致";
        }
        // 3 建立 entity
        MemberEntity member = new MemberEntity();
        member.setName(register.name());
        member.setEmail(register.email());
        member.setPhone(register.phone());
        member.setBirthday(register.birthday());
        // 註冊時先加密再存入資料庫
        String hashedPasswd = BCrypt.hashpw(register.passwd(), BCrypt.gensalt());
        member.setPasswd(hashedPasswd);
        // 預設為一般會員
        member.setRole("USER");
        // 5 存入資料庫
        memberRepo.save(member);
        return "註冊成功";
    }

    // ========== 新增：修改密碼邏輯 ==========
    public String changePasswd(String email, PasswdChangeDto dto) {
        // 1. 基礎格式驗證
        if (!dto.getNewPasswd().equals(dto.getConfirmPasswd())) {
            return "新密碼與確認密碼不一致";
        }
        // 2. 資料庫查詢
        MemberEntity member = memberRepo.findByEmail(email).orElse(null);
        if (member == null) {
            return "找不到會員";
        }
        // 3. 驗證舊密碼是否正確
        if (!BCrypt.checkpw(dto.getCurrentPasswd(), member.getPasswd())) {
            return "目前密碼輸入錯誤";
        }
        // 4. 新舊密碼不可相同
        if (BCrypt.checkpw(dto.getNewPasswd(), member.getPasswd())) {
            return "新密碼不能與舊密碼相同";
        }
        // 5. 更新資料
        String hashedNewPasswd = BCrypt.hashpw(dto.getNewPasswd(), BCrypt.gensalt());
        member.setPasswd(hashedNewPasswd);
        memberRepo.save(member);

        return "密碼修改成功";
    }

    public MemberEntity findById(Integer memberId) {
        return memberRepo.findById(memberId).orElse(null);
    }

    @Transactional
    public void updateMemberProfile(Integer memberId, MemberProfileDTO dto) {

        MemberEntity member = memberRepo.findById(memberId)
            .orElseThrow();

        member.setName(dto.name());
        member.setPhone(dto.phone());
        member.setBirthday(dto.birthday());
        if (dto.memberImgUrl() == null || dto.memberImgUrl().isBlank()) {
            member.setMemberImgUrl(null);
        } else {
            member.setMemberImgUrl(dto.memberImgUrl());
        }
    }

    @Transactional
    public void updateMemberAvatar(Integer memberId, String avatarUrl) {

        MemberEntity member = memberRepo.findById(memberId).orElseThrow();

        member.setMemberImgUrl(avatarUrl);
    }
    
}
