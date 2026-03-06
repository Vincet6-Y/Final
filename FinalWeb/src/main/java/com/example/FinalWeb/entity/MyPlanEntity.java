package com.example.FinalWeb.entity;

import java.time.LocalDate;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "myplan")
@Data
public class MyPlanEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int myPlanId;

    private int memberId;

    private int planId;

    private String myPlanName;

    private LocalDate startDate;
}
