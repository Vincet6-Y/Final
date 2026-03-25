package com.example.FinalWeb.service;

import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.entity.MemberOauthEntity;
import com.example.FinalWeb.enums.AuthProvider;
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

    // 產生 LINE 登入授權網址
    // 這裡會把本次動作記成 login，callback 時就知道要走登入流程
    public String getLineLoginUrl(HttpSession session, String redirect) {

        String state = UUID.randomUUID().toString();
        session.setAttribute("lineLoginState", state);

        // 標記這次 LINE OAuth 是登入流程
        session.setAttribute("lineAction", "login");

        if (redirect != null && !redirect.isBlank()) {
            // 將 lineLoginRedirect 改為 socialRedirect
            session.setAttribute("socialRedirect", redirect);
        }

        return "https://access.line.me/oauth2/v2.1/authorize"
                + "?response_type=code"
                + "&client_id=" + channelId
                + "&redirect_uri=" + callbackUrl
                + "&state=" + state
                + "&scope=profile%20openid%20email";
    }

    // 產生 LINE 綁定授權網址
    // 這裡把本次動作記成 link，callback 時就知道要走綁定流程
    public String getLineLinkUrl(HttpSession session) {

        String state = UUID.randomUUID().toString();
        session.setAttribute("lineLoginState", state);

        // 標記這次 LINE OAuth 是綁定流程
        session.setAttribute("lineAction", "link");

        return "https://access.line.me/oauth2/v2.1/authorize"
                + "?response_type=code"
                + "&client_id=" + channelId
                + "&redirect_uri=" + callbackUrl
                + "&state=" + state
                + "&scope=profile%20openid%20email";
    }

    // 用 LINE callback 回傳的 code 取得使用者資料
    // 會回傳：userId、displayName、email（若 LINE 沒提供則為 null）
    public JsonNode getLineProfile(String code) throws Exception {
        RestTemplate restTemplate = new RestTemplate();

        // 1. 用 code 向 LINE 換 access_token / id_token
        String tokenUrl = "https://api.line.me/oauth2/v2.1/token";

        HttpHeaders tokenHeaders = new HttpHeaders();
        tokenHeaders.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> tokenBody = new LinkedMultiValueMap<>();
        tokenBody.add("grant_type", "authorization_code");
        tokenBody.add("code", code);
        tokenBody.add("redirect_uri", callbackUrl);
        tokenBody.add("client_id", channelId);
        tokenBody.add("client_secret", channelSecret);

        HttpEntity<MultiValueMap<String, String>> tokenRequest = new HttpEntity<>(tokenBody, tokenHeaders);

        ResponseEntity<String> tokenResponse = restTemplate.postForEntity(
                tokenUrl,
                tokenRequest,
                String.class);

        JsonNode tokenJson = objectMapper.readTree(tokenResponse.getBody());
        String accessToken = tokenJson.get("access_token").asText();

        // 2. 用 access_token 取得 LINE 基本資料（userId、displayName）
        String profileUrl = "https://api.line.me/v2/profile";

        HttpHeaders profileHeaders = new HttpHeaders();
        profileHeaders.setBearerAuth(accessToken);

        HttpEntity<String> profileRequest = new HttpEntity<>(profileHeaders);

        ResponseEntity<String> profileResponse = restTemplate.exchange(
                profileUrl,
                HttpMethod.GET,
                profileRequest,
                String.class);

        JsonNode profileJson = objectMapper.readTree(profileResponse.getBody());

        // 3. email 不在 /v2/profile，而是在 id_token 裡
        // 先預設為 null，若 LINE 沒回傳 email 就保持 null
        String email = null;

        if (tokenJson.has("id_token")) {
            String idToken = tokenJson.get("id_token").asText();

            // JWT 的 payload 在第二段，需做 Base64 URL 解碼
            String[] parts = idToken.split("\\.");
            if (parts.length >= 2) {
                String payload = new String(java.util.Base64.getUrlDecoder().decode(parts[1]));
                JsonNode idTokenJson = objectMapper.readTree(payload);

                if (idTokenJson.has("email") && !idTokenJson.get("email").isNull()) {
                    email = idTokenJson.get("email").asText();
                }
            }
        }

        // 4. 把 email 補回 profileJson，讓 controller 可以統一用同一份資料取值
        com.fasterxml.jackson.databind.node.ObjectNode result = (com.fasterxml.jackson.databind.node.ObjectNode) profileJson;
        result.put("email", email);

        return result;
    }

    // 依 LINE userId 查詢是否已綁定本站會員
    public MemberEntity findLinkedMember(String lineUserId) {
        Optional<MemberOauthEntity> oauthOpt = memberOauthRepo.findByProviderAndProviderId(AuthProvider.LINE,
                lineUserId);

        if (oauthOpt.isPresent()) {
            return oauthOpt.get().getMember();
        }
        return null;
    }

    @Transactional
    public void unlinkLine(Integer memberId) {
        memberOauthRepo.deleteByMember_MemberIdAndProvider(memberId, AuthProvider.LINE);
    }
}
