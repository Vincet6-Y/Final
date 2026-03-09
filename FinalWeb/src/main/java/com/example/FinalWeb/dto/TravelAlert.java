package com.example.FinalWeb.dto;

import lombok.Data;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class TravelAlert {
    private String title;
    private String description;
    @JsonProperty("pubDate")
    private String pubDate;
    private String link;

    // Getters and Setters
   // public String getTitle() { return title; }
   // public void setTitle(String title) { this.title = title; }
   // public String getDescription() { return description; }
   // public void setDescription(String description) { this.description = description; }
    //public String getPubDate() { return pubDate; }
    // public void setPubDate(String pubDate) { this.pubDate = pubDate; }
}