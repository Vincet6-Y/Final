package com.example.FinalWeb.entity;

import java.time.LocalDate;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "myplan")
@Data
public class MyPlanEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer myPlanId;

    private String myPlanName;
    private LocalDate startDate;
    
    // 拉關連線到 member
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "memberId")
    private MemberEntity member;
    
    // 拉關連線到 journeyPlan
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "planId")
    private JourneyPlanEntity journeyPlan;

}
