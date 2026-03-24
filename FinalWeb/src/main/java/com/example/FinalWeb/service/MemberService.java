package com.example.FinalWeb.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.FinalWeb.dto.MemberProfileDTO;
import com.example.FinalWeb.dto.MemberRegisterDTO;
import com.example.FinalWeb.dto.PasswdChangeDto;
import com.example.FinalWeb.entity.MemberEntity;
import com.example.FinalWeb.repo.MemberRepo;
import com.example.FinalWeb.util.BCrypt;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

@Service
public class MemberService {

    @Autowired
    private MemberRepo memberRepo;

    public MemberEntity login(String email, String passwd) {
        Optional<MemberEntity> memberEntity = memberRepo.findByEmail(email);
        if (memberEntity.isEmpty()) {
            return null;
        }
        MemberEntity member = memberEntity.get();
        // 已刪除帳號不允許登入
        if (member.isDeleted()) {
            return null;
        }
        // 用 BCrypt 比對輸入密碼與資料庫雜湊密碼
        if (!BCrypt.checkpw(passwd, member.getPasswd())) {
            return null;
        }
        return member;
    }

    // 建立登入後的 Session 與 Spring Security 驗證資訊
    public void saveLoginSession(MemberEntity member, HttpServletRequest request) {
        // 1. 準備權限清單 (資料庫已是 ROLE_ADMIN，直接取用)
        List<GrantedAuthority> authorities = AuthorityUtils.createAuthorityList(member.getRole());
        // 2. 建立一個官方認可的身份憑證 (Authentication)
        Authentication auth = new UsernamePasswordAuthenticationToken(member.getEmail(), null, authorities);
        // 3. 正式把這張憑證塞進 Spring Security 的核心口袋 (SecurityContext)
        SecurityContextHolder.getContext().setAuthentication(auth);
        // 4. 將狀態綁定到 Session 中 (最關鍵的一步！)
        HttpSession session = request.getSession(true);
        // 這是你原本存放使用者資料的地方，保留著完全沒問題，方便你前端畫面使用
        session.setAttribute("loginMember", member);
        // 🌟 新增這行：把安管中心的安全狀態，用 Spring Security 指定的專屬名稱存進 Session 裡！
        session.setAttribute(
                HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                SecurityContextHolder.getContext()
        );
    }

    public String register(MemberRegisterDTO register) {
        // 1 檢查 email 是否已存在
        if (memberRepo.existsByEmail(register.email())) {
            return "Email已註冊";
        }
        // 2. 電話格式
        if (!register.phone().matches("^09\\d{8}$")) {
            return "手機號碼格式不正確";
        }
        // 3. 生日範圍
        if (register.birthday().isAfter(LocalDate.now())) {
            return "生日不能是未來日期";
        }
        if (register.birthday().isBefore(LocalDate.of(1900, 1, 1))) {
            return "請輸入正確的生日";
        }
        // 4. 密碼一致性
        if (!register.passwd().equals(register.confirmPasswd())) {
            return "密碼不一致";
        }
        // 5. 密碼長度
        if (register.passwd().length() < 8) {
            return "密碼長度至少需要 8 個字元";
        }
        // 6. 密碼複雜度
        if (!register.passwd().matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$")) {
            return "密碼需包含大小寫英文及數字";
        }

        // 建立 entity
        MemberEntity member = new MemberEntity();
        member.setName(register.name());
        member.setEmail(register.email());
        member.setPhone(register.phone());
        member.setBirthday(register.birthday());
        // 註冊時先加密再存入資料庫
        String hashedPasswd = BCrypt.hashpw(register.passwd(), BCrypt.gensalt());
        member.setPasswd(hashedPasswd);
        // 預設為一般會員
        member.setRole("USER");
        // 存入資料庫
        memberRepo.save(member);
        return "註冊成功";
    }

    // ========== 新增：修改密碼邏輯 ==========
    public String changePasswd(String email, PasswdChangeDto dto) {
        // 1. 基礎格式驗證
        if (!dto.getNewPasswd().equals(dto.getConfirmPasswd())) {
            return "新密碼與確認密碼不一致";
        }
        if (dto.getNewPasswd().length() < 8) {
            return "密碼長度至少需要 8 個字元";
        }
        if (!dto.getNewPasswd().matches("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$")) {
            return "密碼需包含大小寫英文及數字";
        }

        // 2. 資料庫查詢
        MemberEntity member = memberRepo.findByEmail(email).orElse(null);
        if (member == null) {
            return "找不到會員";
        }
        // 3. 驗證舊密碼是否正確
        if (!BCrypt.checkpw(dto.getCurrentPasswd(), member.getPasswd())) {
            return "目前密碼輸入錯誤";
        }
        // 4. 新舊密碼不可相同
        if (BCrypt.checkpw(dto.getNewPasswd(), member.getPasswd())) {
            return "新密碼不能與舊密碼相同";
        }
        // 5. 更新資料
        String hashedNewPasswd = BCrypt.hashpw(dto.getNewPasswd(), BCrypt.gensalt());
        member.setPasswd(hashedNewPasswd);
        memberRepo.save(member);

        return "密碼修改成功";
    }

    public MemberEntity findById(Integer memberId) {
        return memberRepo.findById(memberId).orElse(null);
    }

    public MemberEntity findByEmail(String email) {
        return memberRepo.findByEmail(email).orElse(null);
    }

    @Transactional
    public void updateMemberProfile(Integer memberId, MemberProfileDTO dto) {

        MemberEntity member = memberRepo.findById(memberId).orElseThrow();

        member.setName(dto.name());
        member.setPhone(dto.phone());
        member.setBirthday(dto.birthday());
        if (dto.memberImgUrl() == null || dto.memberImgUrl().isBlank()) {
            member.setMemberImgUrl(null);
        } else {
            member.setMemberImgUrl(dto.memberImgUrl());
        }
    }

    @Transactional
    public void updateMemberAvatar(Integer memberId, String avatarUrl) {
        MemberEntity member = memberRepo.findById(memberId).orElseThrow();
        member.setMemberImgUrl(avatarUrl);
    }

    @Transactional
    public void softDeleteMember(Integer memberId) {
        MemberEntity member = memberRepo.findById(memberId).orElseThrow();

        String anonymousId = "deleted_" + memberId;

        member.setEmail(anonymousId + "@deleted.invalid");
        member.setName("已刪除會員");
        member.setPhone(null);
        member.setBirthday(LocalDate.of(1900, 1, 1));
        member.setPasswd(null);
        member.setMemberImgUrl(null);
        member.setDeleted(true);

        memberRepo.save(member);
    }
    
}
