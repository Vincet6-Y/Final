package com.example.FinalWeb.entity;

import java.time.LocalDateTime;
import java.util.List;
import jakarta.persistence.Transient;
// ... 其他匯入
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.CascadeType;
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
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Entity
@Table(name = "orders")
@Data
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class OrdersEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer orderId;

    private String payStatus;
    private LocalDateTime orderTime;

    // 綠界相關欄位
    private String tradeNo, paymentType;
    private LocalDateTime payTime;

    // 拉關連線到 member
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "memberId")
    @JsonIgnore
    private MemberEntity member;

    // 拉關連線到 myPlan
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "myPlanId")
    @JsonIgnore
    private MyPlanEntity myPlan;

    // 一對多關聯
    // 訂單包含多筆訂單明細
    // 儲存訂單時，能自動儲存底下的所有明細
    @OneToMany(mappedBy = "orders", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<OrdersDetailEntity> orderDetails;

    

   // 🌟 修正：加上 JsonProperty 讓前端 order.orderItemsName 抓得到值
    @Transient
    @JsonProperty("orderItemsName")
    public String getOrderItemsName() {
        if (this.myPlan != null) {
            return this.myPlan.getMyPlanName(); 
        }
        return "自訂行程";
    }

    // 🌟 修正：加上 JsonProperty 讓前端 order.totalPrice 抓得到值
    @Transient
    @JsonProperty("totalPrice")
    public int getTotalPrice() {
        if (this.orderDetails == null || this.orderDetails.isEmpty()) return 0;
        return this.orderDetails.stream()
                .mapToInt(d -> d.getTicketPrice() != null ? d.getTicketPrice() : 0)
                .sum();
    }
}


