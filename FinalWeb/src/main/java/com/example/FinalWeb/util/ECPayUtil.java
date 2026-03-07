package com.example.FinalWeb.util;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

public class ECPayUtil {

    // 綠界測試環境 3D驗證專用特店(3002607) 的 HashKey 和 HashIV
    private final static String HASH_KEY = "pwFHCqoQZGmho4w6";
    private final static String HASH_IV = "EkRm7iFT261dpevs";

    public static boolean verifyCheckMacValue(Map<String, String> params) {
        String receiveCheckMacValue = params.get("CheckMacValue");
        params.remove("CheckMacValue");
        String calculateCheckMacValue = generateCheckMacValue(params);
        return calculateCheckMacValue.equals(receiveCheckMacValue);
    }

    public static String generateCheckMacValue(Map<String, String> params) {
        StringBuilder sb = new StringBuilder();
        sb.append("HashKey=").append(HASH_KEY);
        for (Map.Entry<String, String> entry : params.entrySet()) {
            sb.append("&").append(entry.getKey()).append("=").append(entry.getValue());
        }
        sb.append("&HashIV=").append(HASH_IV);

        String encodedStr = URLEncoder.encode(sb.toString(), StandardCharsets.UTF_8).toLowerCase();

        // 綠界的 URL Encode 特殊規則處理
        encodedStr = encodedStr.replace("%2d", "-")
                .replace("%5f", "_")
                .replace("%2e", ".")
                .replace("%21", "!")
                .replace("%2a", "*")
                .replace("%28", "(")
                .replace("%29", ")")
                .replace("%20", "+");

        return sha256(encodedStr).toUpperCase();
    }

    private static String sha256(String str) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(str.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1)
                    hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 calculation error", e);
        }
    }
}
