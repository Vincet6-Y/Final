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
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "workdetail")
@Data
public class WorkDetailEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer workId;

    private String workName;
    private LocalDate onDate;
    private String workClass;
    private String workImg;

    // --------------------------------------------------
    // 一個作品可以在很多個行程中出現
    @JsonIgnore
    @OneToMany(mappedBy = "workDetail", fetch = FetchType.LAZY)
    private List<JourneyPlanEntity> journeyPlan = new ArrayList<>();

}
