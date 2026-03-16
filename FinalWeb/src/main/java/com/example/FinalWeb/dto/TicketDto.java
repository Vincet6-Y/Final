package com.example.FinalWeb.dto;

public record TicketDto(
        String ticketId,
        String ticketName,
        Integer price) {
    public String getTicketId() {
        return ticketId();
    }

    public String getTicketName() {
        return ticketName();
    }

    public Integer getPrice() {
        return price();
    }
}
