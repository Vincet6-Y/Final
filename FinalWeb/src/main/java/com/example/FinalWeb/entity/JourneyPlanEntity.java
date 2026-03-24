package com.example.FinalWeb.entity;

import java.util.List;
import java.util.Map;

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
import jakarta.persistence.Transient;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Entity
@Table(name = "journeyplan")
@Data
public class JourneyPlanEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer planId;

    private Integer daysCount;
    private String planName;
    private String planCity;

    @Transient
    private Map<Integer, String> groupedDays; // Key 是第幾天 (1, 2, 3...)，Value 是串好的字串 ("地點A、地點B")
    
    @Transient
    private Map<Integer, String> groupedImages; 

    private Boolean status = false;

    // 拉關連線到 workDetail
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workId")
    private WorkDetailEntity workDetail;

    // 一對多關聯
    // 行程方案可以被多人收藏
    @OneToMany(mappedBy = "journeyPlan")
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<FavoritesEntity> favorites;

    // 行程方案可以被多人存入行程
    @OneToMany(mappedBy = "journeyPlan")
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<MyPlanEntity> myPlans;

    // 行程方案可以被多人存入行程，且底下有多個地圖景點
    @OneToMany(mappedBy = "journeyPlan")
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<MapEntity> maps;

}
