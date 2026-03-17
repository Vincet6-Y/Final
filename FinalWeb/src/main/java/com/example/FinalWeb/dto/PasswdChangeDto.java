package com.example.FinalWeb.dto;

import lombok.Data;

@Data
public class PasswdChangeDto {
    private String currentPasswd;
    private String newPasswd;
    private String confirmPasswd;
}
