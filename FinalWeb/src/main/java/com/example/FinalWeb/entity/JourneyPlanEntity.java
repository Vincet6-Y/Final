package com.example.FinalWeb.entity;

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
@Table(name = "journeyplan")
@Data
public class JourneyPlanEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer planId;

    private Integer daysCount;
    private String planName;
    
    // 拉關連線到 workDetail
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workId")
    private WorkDetailEntity workDetail;

}
