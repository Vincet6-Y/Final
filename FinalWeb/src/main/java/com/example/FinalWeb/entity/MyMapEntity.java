package com.example.FinalWeb.entity;

import java.math.BigDecimal;

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
import jakarta.persistence.Transient;
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

    // 拉關連線到 myPlan
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "myPlanId")
    @JsonIgnore
    private MyPlanEntity myPlan;

    @Transient
public String getOrderItemsName() {
    if (this.myPlan != null) {
        // 確保 MyPlanEntity 有 planName 字段和 getPlanName() 方法
        // 如果 MyPlanEntity 的字段名稱不同，請替換為正確的名稱，例如 getName()
        return this.myPlan.getMyPlanName();
    }
    return "自訂行程";
}

}
