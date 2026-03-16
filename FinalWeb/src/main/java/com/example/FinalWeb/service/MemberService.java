package com.example.FinalWeb.service;


import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.FinalWeb.dto.MemberRegisterDTO;
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
}
