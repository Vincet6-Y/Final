package com.example.FinalWeb.service;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class TicketService {

    // 1. 建立一個內部類別，用來打包要「回傳的票券資訊」
    public static class TicketInfo {
        // 將屬性設為 private，保護資料不被外部隨意修改 (封裝)
        private String ticketName;
        private Integer price;

        public TicketInfo(String ticketName, Integer price) {
            this.ticketName = ticketName;
            this.price = price;
        }

        // 提供 Getter 讓外部可以讀取資料
        public String getTicketName() {
            return ticketName;
        }

        public Integer getPrice() {
            return price;
        }
    }

    // 2. 宣告一個常數 Map，用來當作我們的「票券資料庫快取」
    private static final Map<String, TicketInfo> TICKET_CACHE = new HashMap<>();

    // 3. 靜態初始化區塊 (Static Block)：當程式啟動、類別被載入時，就會執行這裡面的程式碼
    static {
        // 📍鏈鋸人 新江之島水族館
        TICKET_CACHE.put("ChIJr6UTdvlOGGART30L2LcRlmc", new TicketInfo("鏈鋸人 新江之島水族館門票", 500));
        // 📍 你的名字 須賀神社
        TICKET_CACHE.put("ChIJ8VLVBuTsGGARfIDGqQDmC0Q", new TicketInfo("你的名字 須賀神社參拜套票", 500));
        // 📍 你的名字 國立新美術館
        TICKET_CACHE.put("ChIJP-vO9nuLGGARGJ2q8uryJUA", new TicketInfo("你的名字 國立新美術館門票", 400));
        // 📍 孤獨搖滾！ 下北澤 SHELTER
        TICKET_CACHE.put("ChIJscIAGGrzGGAROoW9kySUQYQ", new TicketInfo("孤獨搖滾！下北澤 Live House 體驗券", 800));
        // 📍 孤獨搖滾！江之島 展望燈塔
        TICKET_CACHE.put("ChIJvVsEzuVOGGARs99YuxNfbDU", new TicketInfo("孤獨搖滾！江之島 展望燈塔門票", 500));
        // 📍 幸運☆星 鷲宮神社
        TICKET_CACHE.put("ChIJQSDrYJu4GGARD_broFBjNUM", new TicketInfo("幸運☆星 鷲宮神社參拜套票", 500));
        // 📍 幸運☆星 久喜市立鷲宮圖書館
        TICKET_CACHE.put("ChIJCcRjTTnKGGARLtY-7WEX5aI", new TicketInfo("幸運☆星 久喜市立鷲宮圖書館門票", 300));
        // 📍 灌籃高手 鎌倉高校前站平交道
        TICKET_CACHE.put("ChIJIRZ85hZPGGARffzavFo4QRk", new TicketInfo("灌籃高手 平交道拍照觀景台門票", 200));
        // 📍情書 北一硝子三號館（星空咖啡店）
        TICKET_CACHE.put("ChIJ___DnVrgCl8RruTc290c3p8", new TicketInfo("情書 北一硝子三號館（星空咖啡店）門票", 200));
        // 📍情書 小樽天狗山滑雪場
        TICKET_CACHE.put("ChIJNZSPr8LgCl8R_ro2ttgpg7U", new TicketInfo("情書 小樽天狗山滑雪場門票", 300));
        // 📍神劍闖江湖 真人版 滋賀縣 三井寺（園城寺）
        TICKET_CACHE.put("ChIJW_hH73EMAWAR3DLfYrSpmdA", new TicketInfo("神劍闖江湖 真人版 三井寺（園城寺）門票", 500));
        // 📍神劍闖江湖 真人版 京都府 上賀茂神社
        TICKET_CACHE.put("ChIJceHc0AmoAWARLsqeCrglA1o", new TicketInfo("神劍闖江湖 真人版 上賀茂神社門票", 300));
        // 📍解憂雜貨店 昭和之町展示館
        TICKET_CACHE.put("ChIJA-xD_h4ORDURYiAz8lXTUeo", new TicketInfo("解憂雜貨店 昭和之町展示館門票", 300));
        // 📍海街日記 成就院
        TICKET_CACHE.put("ChIJX36g4vZFGGARGocG2lY-Gko", new TicketInfo("海街日記 成就院門票", 300));

        // 以下為假GooglePlaceId
        // 📍 假設這裡是 搖曳露營 浩庵露營場
        TICKET_CACHE.put("ChIJ0xwB58aGGGAR1a99aA4pZ5g", new TicketInfo("搖曳露營 富士山絕景露營門票", 1200));
        // 📍 假設這裡是 涼宮春日 珈琲屋 夢
        TICKET_CACHE.put("ChIJU-R-Qj7xGGART2Q70wN38l0", new TicketInfo("涼宮春日 咖啡廳聯名餐飲券", 400));
    }

    /**
     * 傳入 GooglePlaceId，判斷這個景點有沒有賣票！
     */
    public TicketInfo getTicketByPlaceId(String googlePlaceId) {
        // 防呆機制：如果傳入的 ID 是空的，直接回傳 null
        if (googlePlaceId == null || googlePlaceId.isEmpty()) {
            return null;
        }

        // 4. 核心邏輯：直接去 Map 裡面拿資料
        // 如果 Map 裡面有這個 ID（Key），就會回傳對應的 TicketInfo（Value）
        // 如果找不到，Map.get() 預設就會回傳 null，剛好符合我們的需求！
        return TICKET_CACHE.get(googlePlaceId);
    }
}