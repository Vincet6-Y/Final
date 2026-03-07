package com.example.FinalWeb.entity;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
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

    // --------------------------------------------------
    // 同一個 member 可以有多個 myPlan
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "memberId")
    private MemberEntity member;

    // --------------------------------------------------
    // 同一個 myPlan 底下會有很多景點
    @JsonIgnore
    @OneToMany(mappedBy = "myPlan", fetch = FetchType.LAZY)
    private List<MyMapEntity> myMap = new ArrayList<>();


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "planId")
    private JourneyPlanEntity journeyPlan;

}
