package com.example.FinalWeb.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;

@Configuration
public class FirebaseAdminConfig {

    @PostConstruct
    public void init() throws IOException {
        if (!FirebaseApp.getApps().isEmpty()) return;

        ClassPathResource resource = new ClassPathResource("firebase/firebase-key.json");
        InputStream serviceAccount = resource.getInputStream();

        FirebaseOptions options = FirebaseOptions.builder()
            .setCredentials(GoogleCredentials.fromStream(serviceAccount))
            .build();

        FirebaseApp.initializeApp(options);
    }
}