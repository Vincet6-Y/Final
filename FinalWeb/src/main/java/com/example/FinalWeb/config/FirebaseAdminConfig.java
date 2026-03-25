package com.example.FinalWeb.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

@Configuration
public class FirebaseAdminConfig {

    @PostConstruct
    public void init() {
        try {
            InputStream serviceAccount;
            
            // 1. 去尋找系統有沒有設定這個「雲端專用路徑」的提貨券
            String cloudKeyPath = System.getenv("FIREBASE_KEY_PATH");

            if (cloudKeyPath != null && !cloudKeyPath.isEmpty()) {
                // 2. 如果在 Render 上 (有這張提貨券)，就去讀取 /etc/secrets/ 裡的實體檔案
                serviceAccount = new FileInputStream(cloudKeyPath);
                System.out.println("成功！目前使用雲端 Render 實體金鑰：" + cloudKeyPath);
            } else {
                // 3. 如果在你自己電腦上 (沒有提貨券)，就維持原本去 classpath 找的寫法
                serviceAccount = new ClassPathResource("firebase/firebase-key.json").getInputStream();
                System.out.println("成功！目前使用本地端 classpath 金鑰");
            }

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            // 確保 Firebase 不會被重複初始化而報錯
            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
            }
            
        } catch (Exception e) {
            System.err.println("Firebase 初始化失敗，請檢查金鑰路徑！");
            e.printStackTrace();
        }
    }
}