package com.example.FinalWeb.service;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.example.FinalWeb.entity.MemberEntity;

@Service
public class LineLoginService {
    
    @Value("${line.login.channel-id}")
    private String channelId;

    @Value("${line.login.channel-secret}")
    private String channelSecret;

    @Value("${line.login.callback-url}")
    private String callbackUrl;

    public String getLineLoginUrl() {

        String state = UUID.randomUUID().toString();

        return "https://access.line.me/oauth2/v2.1/authorize"
                + "?response_type=code"
                + "&client_id=" + channelId
                + "&redirect_uri=" + callbackUrl
                + "&state=" + state
                + "&scope=profile%20openid%20email";
    }


    public MemberEntity loginWithLine(String code) {

        // 這裡之後會做三件事
        // 1 用 code 換 access_token
        // 2 取得 LINE profile
        // 3 用 lineId 查會員

        return null;
    }
}
