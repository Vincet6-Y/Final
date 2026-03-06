package com.example.FinalWeb.entity;

import java.time.LocalDate;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "workdetail")
@Data
public class WorkDetailEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int workId;

    private String workName;

    private LocalDate onDate;

    private String workClass;

    private String workImg;
}
