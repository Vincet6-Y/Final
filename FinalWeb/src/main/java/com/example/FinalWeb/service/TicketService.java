package com.example.FinalWeb.service;

import org.springframework.stereotype.Service;

@Service
public class TicketService {
    // 建立一個內部類別，用來打包要「回傳的票券資訊」
    public static class TicketInfo {
        public String ticketName;
        public Integer price;

        public TicketInfo(String ticketName, Integer price) {
            this.ticketName = ticketName;
            this.price = price;
        }
    }

    /**
     * 傳入 GooglePlaceId，判斷這個景點有沒有賣票！
     * 如果有賣票 -> 回傳該景點的票券與價格
     * 如果沒賣票 -> 回傳 null
     */
    public TicketInfo getTicketByPlaceId(String googlePlaceId) {
        if (googlePlaceId == null || googlePlaceId.isEmpty()) {
            return null;
        }
        // 根據絕對不會變動的 GooglePlaceId 判斷！
        switch (googlePlaceId) {
            // 📍鏈鋸人-新江之島水族館
            case "ChIJr6UTdvlOGGART30L2LcRlmc":
                return new TicketInfo("鏈鋸人-新江之島水族館門票", 500);
            // 📍 你的名字 須賀神社
            case "ChIJAyWqAPdfImARdOlSRxQ5AYc":
                return new TicketInfo("你的名字 聖地巡禮專屬套票", 500);
            // 📍 你的名字 國立新美術館
            case "ChIJP-vO9nuLGGARGJ2q8uryJUA":
                return new TicketInfo("你的名字 國立新美術館門票", 400);

            // 以下為假GooglePlaceId
            // 📍 假設這裡是 灌籃高手 平交道
            case "ChIJxY261F5gGGARY18fXgK9rFw":
                return new TicketInfo("灌籃高手 平交道拍照觀景台門票", 200);
            // 📍 假設這裡是 孤獨搖滾！ 下北澤 SHELTER
            case "ChIJ5Zz-K-6MGGARuS5z8k1A-mU":
                return new TicketInfo("孤獨搖滾！ 下北澤 Live House 體驗券", 800);
            // 📍 假設這裡是 搖曳露營 浩庵露營場
            case "ChIJ0xwB58aGGGAR1a99aA4pZ5g":
                return new TicketInfo("搖曳露營 富士山絕景露營門票", 1200);
            // 📍 假設這裡是 涼宮春日 珈琲屋 夢
            case "ChIJU-R-Qj7xGGART2Q70wN38l0":
                return new TicketInfo("涼宮春日 咖啡廳聯名餐飲券", 400);
            // 如果該景點的 GooglePlaceId 我們根本沒合作、也沒登錄，那就回傳 null (不產生票券)
            default:
                return null;
        }
    }
}
