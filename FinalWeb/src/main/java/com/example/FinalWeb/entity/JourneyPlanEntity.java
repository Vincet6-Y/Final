package com.example.FinalWeb.entity;

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
@Table(name = "journeyplan")
@Data
public class JourneyPlanEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer planId;

    private Integer workId;
    private Integer daysCount;
    private String planName;

    // --------------------------------------------------
    // 一個 journeyplan 可以出現在很多 favorites 紀錄中
    @JsonIgnore
    @OneToMany(mappedBy = "journeyPlan", fetch = FetchType.LAZY)
    private List<FavoritesEntity> favorites = new ArrayList<>();

}
