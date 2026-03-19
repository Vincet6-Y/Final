package com.example.FinalWeb.service;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.FinalWeb.dto.SocialProfileDTO;
import com.example.FinalWeb.entity.MemberOauthEntity;
import com.example.FinalWeb.enums.AuthProvider;
import com.example.FinalWeb.repo.MemberOauthRepo;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;

@Service
public class GoogleLoginService {

    @Autowired
    private MemberOauthRepo memberOauthRepo;

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

    @Transactional
    public boolean unlinkGoogle(Integer memberId) {
        Optional<MemberOauthEntity> oauthOpt =
                memberOauthRepo.findByMember_MemberIdAndProvider(memberId, AuthProvider.GOOGLE);

        if (oauthOpt.isEmpty()) {
            return false;
        }

        memberOauthRepo.delete(oauthOpt.get());
        return true;
    }
}