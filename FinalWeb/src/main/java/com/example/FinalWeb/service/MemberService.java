package com.example.FinalWeb.service;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.repo.MemberRepo;

@Service
public class MemberService {

    @Autowired
    private MemberRepo memberRepo;

    public boolean login(String email, String passwd) {

        Optional<MemberEntity> memberEntity = memberRepo.findByEmail(email);

        if (memberEntity.isEmpty()) {
            return false;
        }

        MemberEntity member = memberEntity.get();

        return member.getPasswd().equals(passwd);
    }
}
