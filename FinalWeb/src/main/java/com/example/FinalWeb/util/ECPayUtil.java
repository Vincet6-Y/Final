package com.example.FinalWeb.util;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.TreeMap;

import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;

@Component
public class ECPayUtil {
    private static String HASH_KEY;
    private static String HASH_IV;

    @Value("${ecpay.hash-key}")
    public void setHashKey(String hashKey) {
        ECPayUtil.HASH_KEY = hashKey;
    }

    @Value("${ecpay.hash-iv}")
    public void setHashIv(String hashIv) {
        ECPayUtil.HASH_IV = hashIv;
    }

    public static boolean verifyCheckMacValue(Map<String, String> params) {
        String receiveCheckMacValue = params.get("CheckMacValue");
        if (receiveCheckMacValue == null) {
            return false;
        }

        // TreeMap 實作了自動依 Key 值（字母 A-Z）排序的功能
        Map<String, String> treeMap = new TreeMap<>(params);
        treeMap.remove("CheckMacValue");

        String calculateCheckMacValue = generateCheckMacValue(treeMap);
        return calculateCheckMacValue.equals(receiveCheckMacValue);
    }

    public static String generateCheckMacValue(Map<String, String> params) {
        StringBuilder sb = new StringBuilder();
        sb.append("HashKey=").append(HASH_KEY);

        for (Map.Entry<String, String> entry : params.entrySet()) {
            sb.append("&").append(entry.getKey()).append("=").append(entry.getValue());
        }
        sb.append("&HashIV=").append(HASH_IV);

        // 使用 UTF-8 進行 URL Encode，並轉為小寫
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
        // 進行 SHA-256 雜湊並轉為大寫
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
