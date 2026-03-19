package com.example.FinalWeb.entity;

import com.example.FinalWeb.enums.AuthProvider;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;


// 第三方登入綁定資料表
// 記錄會員與第三方平台（如 LINE、Google）之間的關聯。
@Entity
@Table(name = "memberoauth", uniqueConstraints = {
        // 確保同一個第三方帳號不會被多個會員綁定
        @UniqueConstraint(columnNames = {"provider", "providerId"}),
        // 確保同一會員在同一第三方平台（如 Google / LINE）不會綁定多個帳號
        @UniqueConstraint(columnNames = {"memberId", "provider"})}
    )
@Data
public class MemberOauthEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // 第三方登入來源（LINE / GOOGLE）
    // 使用 Enum 存字串，避免 ordinal 問題
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuthProvider provider;

    // 第三方平台的使用者唯一識別碼
    @Column(nullable = false, length = 100)
    private String providerId;

    // 多對一關聯
    // 多筆第三方帳號可以綁定同一個會員
    @ManyToOne
    @JoinColumn(name = "memberId", nullable = false)
    private MemberEntity member;

}
