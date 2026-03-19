package com.example.FinalWeb.dto;

import java.time.LocalDate;

public record MemberProfileDTO(
    String name,
    String phone,
    LocalDate birthday
) {}
