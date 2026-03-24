package com.example.FinalWeb.service;

import com.example.FinalWeb.entity.EmailVerificationEntity;
import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.repo.EmailVerificationRepo;
import com.example.FinalWeb.repo.MemberRepo;
import com.example.FinalWeb.util.BCrypt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class EmailVerifyService {

    @Autowired
    private MemberRepo memberRepo;

    @Autowired
    private EmailVerificationRepo emailVerificationRepo;

    @Autowired
    private JavaMailSender mailSender;

    @Value("${app.base-url}")
    private String baseUrl;

    // 1. 收到 email → 寄重設信
    @Transactional
    public void sendResetEmail(String email) {
        MemberEntity member = memberRepo.findByEmail(email).orElse(null);
        // 不管 email 存不存在，都回傳相同訊息（防止帳號列舉攻擊）
        if (member == null) return;

        // 刪除舊 token，避免重複請求累積
        emailVerificationRepo.deleteByMember_MemberId(member.getMemberId());

        // 產生新 token
        String token = UUID.randomUUID().toString();
        EmailVerificationEntity resetToken = new EmailVerificationEntity();
        resetToken.setToken(token);
        resetToken.setMember(member);
        resetToken.setTokenDeadline(LocalDateTime.now().plusMinutes(15));
        resetToken.setUsed(false);
        emailVerificationRepo.save(resetToken);

        // 寄信
        String resetLink = baseUrl + "/auth/reset-password?token=" + token;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("【聖地巡禮】重設密碼請求");
        message.setText(
            "您好，\n\n" +
            "我們收到您的密碼重設請求，請點擊以下連結完成重設（連結 15 分鐘內有效）：\n\n" +
            resetLink + "\n\n" +
            "若您沒有發出此請求，請忽略此信件。\n\n" +
            "— 聖地巡禮團隊"
        );
        mailSender.send(message);
    }

    // 2. 驗證 token 是否有效
    public EmailVerificationEntity validateToken(String token) {
        return emailVerificationRepo.findByToken(token).filter(t ->
            !t.isUsed() && t.getTokenDeadline().isAfter(LocalDateTime.now())
        ).orElse(null);
    }

    // 3. 執行重設密碼
    @Transactional
    public String resetPassword(String token, String newPasswd, String confirmPasswd) {
        // 基本驗證
        if (!newPasswd.equals(confirmPasswd)) return "兩次輸入的密碼不一致";
        if (newPasswd.length() < 8) return "密碼長度至少需要 8 個字元";
        if (!newPasswd.matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$"))
            return "密碼需包含大小寫英文及數字";

        EmailVerificationEntity resetToken = validateToken(token);
        if (resetToken == null) return "連結已失效或已使用，請重新申請";

        // 更新密碼
        MemberEntity member = resetToken.getMember();
        member.setPasswd(BCrypt.hashpw(newPasswd, BCrypt.gensalt()));
        memberRepo.save(member);

        // 標記 token 已使用
        resetToken.setUsed(true);
        emailVerificationRepo.save(resetToken);

        return "success";
    }
}