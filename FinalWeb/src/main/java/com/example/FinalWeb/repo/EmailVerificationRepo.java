package com.example.FinalWeb.repo;

import com.example.FinalWeb.entity.EmailVerificationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface EmailVerificationRepo extends JpaRepository<EmailVerificationEntity, Integer> {
    Optional<EmailVerificationEntity> findByToken(String token);
    void deleteByMember_MemberId(Integer memberId);
}