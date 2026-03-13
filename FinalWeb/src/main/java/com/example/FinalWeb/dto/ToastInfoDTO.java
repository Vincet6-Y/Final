package com.example.FinalWeb.dto;

public record ToastInfoDTO(String type, String message) {
    
    public static ToastInfoDTO success(String message) {
        return new ToastInfoDTO("success", message);
    }

    public static ToastInfoDTO error(String message) {
        return new ToastInfoDTO("error", message);
    }

    public static ToastInfoDTO info(String message) {
        return new ToastInfoDTO("info", message);
    }
}
