package com.example.FinalWeb.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "emailverification")
@Data
public class EmailVerificationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 100)
    private String token;

    @Column(nullable = false)
    private LocalDateTime tokenDeadline;

    @Column(length = 255)
    private String pendingEmail; // null = 重設密碼用途，有值 = 修改 email 用途

    @ManyToOne
    @JoinColumn(name = "memberId", nullable = false)
    private MemberEntity member;

}