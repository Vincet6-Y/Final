package com.example.FinalWeb.dto;

import java.time.LocalDate;

public record MemberRegisterDTO(
        String name,
        String email,
        String phone,
        LocalDate birthday,
        String passwd,
        String confirmPasswd
) {}
