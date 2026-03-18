package com.example.FinalWeb.dto;

import com.example.FinalWeb.entity.MemberEntity;

public record SessionMemberDTO(Integer memberId,
                                String email,
                                String name,
                                String role) {
    public static SessionMemberDTO from(MemberEntity member) {
        return new SessionMemberDTO(
            member.getMemberId(),
            member.getEmail(),
            member.getName(),
            member.getRole()
        );
    }
}
