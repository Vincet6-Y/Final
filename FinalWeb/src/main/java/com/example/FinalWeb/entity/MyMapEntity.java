package com.example.FinalWeb.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
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
@Table(name = "mymap")
@Data
public class MyMapEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer spotId;

    private Integer dayNumber;
    private Integer visitOrder;
    private String locationName;

    @Column(name = "longitude", precision = 10, scale = 6, columnDefinition = "DECIMAL(10,6)")
    private BigDecimal longitude;
    @Column(name = "latitude", precision = 10, scale = 6, columnDefinition = "DECIMAL(10,6)")
    private BigDecimal latitude;
    private String GooglePlaceId;

    // 🌟 修正 2：加上 JSON 格式化標籤
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime visitTime;
    private String transitMode;
    private Integer stayTime, transitTime, distance;

    // 拉關連線到 myPlan
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "myPlanId")
    @JsonIgnore
    private MyPlanEntity myPlan;

}
