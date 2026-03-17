package com.example.FinalWeb.service;

import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.entity.MemberOauthEntity;
import com.example.FinalWeb.repo.MemberOauthRepo;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpSession;

@Service
public class LineLoginService {
    
    @Value("${line.login.channel-id}")
    private String channelId;

    @Value("${line.login.channel-secret}")
    private String channelSecret;

    @Value("${line.login.callback-url}")
    private String callbackUrl;

    @Autowired
    private MemberOauthRepo memberOauthRepo;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public String getLineLoginUrl(HttpSession session, String redirect) {

        String state = UUID.randomUUID().toString();
        session.setAttribute("lineLoginState", state);

        return "https://access.line.me/oauth2/v2.1/authorize"
                + "?response_type=code"
                + "&client_id=" + channelId
                + "&redirect_uri=" + callbackUrl
                + "&state=" + state
                + "&scope=profile%20openid%20email";
    }


    public MemberEntity loginWithLine(String code) {
        try {
            RestTemplate restTemplate = new RestTemplate();

            // 1. 用 code 換 access_token
            String tokenUrl = "https://api.line.me/oauth2/v2.1/token";

            HttpHeaders tokenHeaders = new HttpHeaders();
            tokenHeaders.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> tokenBody = new LinkedMultiValueMap<>();
            tokenBody.add("grant_type", "authorization_code");
            tokenBody.add("code", code);
            tokenBody.add("redirect_uri", callbackUrl);
            tokenBody.add("client_id", channelId);
            tokenBody.add("client_secret", channelSecret);

            HttpEntity<MultiValueMap<String, String>> tokenRequest =
                    new HttpEntity<>(tokenBody, tokenHeaders);

            ResponseEntity<String> tokenResponse = restTemplate.postForEntity(
                    tokenUrl,
                    tokenRequest,
                    String.class
            );

            JsonNode tokenJson = objectMapper.readTree(tokenResponse.getBody());
            String accessToken = tokenJson.get("access_token").asText();

            // 2. 用 access_token 取得 LINE profile
            String profileUrl = "https://api.line.me/v2/profile";

            HttpHeaders profileHeaders = new HttpHeaders();
            profileHeaders.setBearerAuth(accessToken);

            HttpEntity<String> profileRequest = new HttpEntity<>(profileHeaders);

            ResponseEntity<String> profileResponse = restTemplate.exchange(
                    profileUrl,
                    HttpMethod.GET,
                    profileRequest,
                    String.class
            );

            JsonNode profileJson = objectMapper.readTree(profileResponse.getBody());
            String lineUserId = profileJson.get("userId").asText();

            // 3. 用 provider + providerId 查 memberoauth
            Optional<MemberOauthEntity> oauthOpt =
                    memberOauthRepo.findByProviderAndProviderId("LINE", lineUserId);

            if (oauthOpt.isPresent()) {
                return oauthOpt.get().getMember();
            }

            // 尚未綁定 LINE 帳號
            return null;

        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}
