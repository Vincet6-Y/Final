package com.example.FinalWeb.entity;

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

    // 顯示官方行程時，要取得該行程底下所有景點與順序
    @JsonIgnore
    @OneToMany(mappedBy = "journeyPlan", fetch = FetchType.LAZY)
    private List<MapEntity> map = new ArrayList<>();
    
}
