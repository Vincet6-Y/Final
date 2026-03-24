package com.example.FinalWeb.dto;

import lombok.Data;

@Data
public class PasswdChangesDTO {
    private String currentPasswd;
    private String newPasswd;
    private String confirmPasswd;
}
