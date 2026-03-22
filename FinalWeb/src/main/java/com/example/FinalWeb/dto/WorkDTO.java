package com.example.FinalWeb.dto;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;

public record WorkDTO(
        String workName,

        // 加上這個標籤，當作日期格式的翻譯官
        @DateTimeFormat(pattern = "yyyy-MM-dd") 
        LocalDate onDate,

        String workClass,
        String workImg,
        String description,
        String director,
        String writer,
        String location,
        Integer movielength,
        Integer episodes,
        Integer workId) {

}
