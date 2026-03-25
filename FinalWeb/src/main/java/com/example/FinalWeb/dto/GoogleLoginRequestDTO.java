package com.example.FinalWeb.dto;

// 新增 String redirect 屬性
public record GoogleLoginRequestDTO(String idToken, String redirect) {
}