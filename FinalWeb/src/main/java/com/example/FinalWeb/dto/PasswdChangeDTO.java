package com.example.FinalWeb.dto;

import lombok.Data;

@Data
public class PasswdChangeDTO {
    private String currentPasswd;
    private String newPasswd;
    private String confirmPasswd;
}
