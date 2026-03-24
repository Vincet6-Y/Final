package com.example.FinalWeb.service;

import com.example.FinalWeb.entity.EmailVerificationEntity;
import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.repo.EmailVerificationRepo;
import com.example.FinalWeb.repo.MemberRepo;
import com.example.FinalWeb.util.BCrypt;

import jakarta.servlet.http.HttpSession;

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

    // 2. 驗證 token 存不存在 + 有沒有過期
    public EmailVerificationEntity validateToken(String token) {
        return emailVerificationRepo.findByToken(token).filter(t ->
            t.getTokenDeadline().isAfter(LocalDateTime.now())
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

        emailVerificationRepo.delete(resetToken);

        return "success";
    }

    // 4. 寄送修改 email 驗證信
    @Transactional
    public void sendEmailChangeVerification(MemberEntity member, String newEmail) {

        // 檢查新 email 是否已被使用
        if (memberRepo.existsByEmail(newEmail)) {
            throw new IllegalStateException("此 Email 已被其他帳號使用");
        }

        // 刪除該會員舊的 token
        emailVerificationRepo.deleteByMember_MemberId(member.getMemberId());

        // 產生新 token
        String token = UUID.randomUUID().toString();
        EmailVerificationEntity verifyToken = new EmailVerificationEntity();
        verifyToken.setToken(token);
        verifyToken.setMember(member);
        verifyToken.setPendingEmail(newEmail);  // 標記這是修改 email 用途
        verifyToken.setTokenDeadline(LocalDateTime.now().plusHours(24));
        emailVerificationRepo.save(verifyToken);

        // 寄信到新 email
        String confirmLink = baseUrl + "/member/confirm-email-change?token=" + token;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(newEmail);
        message.setSubject("【聖地巡禮】確認修改 Email");
        message.setText(
            "您好，\n\n" +
            "我們收到您的 Email 修改請求，請點擊以下連結完成確認（連結 24 小時內有效）：\n\n" +
            confirmLink + "\n\n" +
            "若您沒有發出此請求，請忽略此信件。\n\n" +
            "— 聖地巡禮團隊"
        );
        mailSender.send(message);
    }

    // 5. 確認修改 email（點擊連結後執行）
    @Transactional
    public String confirmEmailChange(String token, HttpSession session) {

        EmailVerificationEntity verifyToken = validateToken(token);
        if (verifyToken == null) return "連結已失效或已使用，請重新申請";

        // 確認這個 token 是修改 email 用途
        String newEmail = verifyToken.getPendingEmail();
        if (newEmail == null || newEmail.isBlank()) return "無效的操作";

        // 點擊當下再次確認新 email 沒有被搶註
        if (memberRepo.existsByEmail(newEmail)) {
            emailVerificationRepo.delete(verifyToken);
            return "此 Email 已被其他帳號使用，請重新申請";
        }

        // 更新 email
        MemberEntity member = verifyToken.getMember();
        member.setEmail(newEmail);
        memberRepo.save(member);

        // 同步 session（若使用者當下有登入）
        MemberEntity sessionMember = (MemberEntity) session.getAttribute("loginMember");
        if (sessionMember != null && sessionMember.getMemberId().equals(member.getMemberId())) {
            sessionMember.setEmail(newEmail);
            session.setAttribute("loginMember", sessionMember);
        }

        emailVerificationRepo.delete(verifyToken);
        return "success";
    }
}