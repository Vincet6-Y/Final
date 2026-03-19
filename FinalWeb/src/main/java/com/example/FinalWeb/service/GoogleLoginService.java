package com.example.FinalWeb.service;


import org.springframework.stereotype.Service;


import com.example.FinalWeb.dto.SocialProfileDTO;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;

@Service
public class GoogleLoginService {


    public SocialProfileDTO verifyGoogleIdToken(String idToken) throws Exception {
        FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(idToken);

        String providerId = decodedToken.getUid();

        String name = "";
        Object nameObj = decodedToken.getClaims().get("name");
        if (nameObj != null) {
            name = nameObj.toString();
        }

        String email = "";
        Object emailObj = decodedToken.getClaims().get("email");
        if (emailObj != null) {
            email = emailObj.toString();
        }

        return new SocialProfileDTO(providerId, name, email);
    }


}