package com.example.FinalWeb.service;


import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.FinalWeb.dto.MemberRegisterDTO;
import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.repo.MemberRepo;

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
        
        if (!member.getPasswd().equals(passwd)) {
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
        member.setPasswd(register.passwd());

        // 預設為一般會員
        member.setRole("USER");

        // 5 存入資料庫
        memberRepo.save(member);

        return "註冊成功";
    }
}
