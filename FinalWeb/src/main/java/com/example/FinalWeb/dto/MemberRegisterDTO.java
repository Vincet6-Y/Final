package com.example.FinalWeb.dto;

public record MemberRegisterDTO(
        String name,
        String email,
        String phone,
        String birthday,
        String passwd,
        String confirmPasswd
) {}
