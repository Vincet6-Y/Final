package com.example.FinalWeb.service;

import org.springframework.stereotype.Service;
import com.example.FinalWeb.entity.MyMapEntity;

import java.util.*;

@Service
public class TicketService {

    // 內部類別 (DTO)：打包回傳的票券資訊，已封裝保護
    public static class TicketInfo {
        private String ticketName;
        private Integer price;

        public TicketInfo(String ticketName, Integer price) {
            this.ticketName = ticketName;
            this.price = price;
        }

        public String getTicketName() {
            return ticketName;
        }

        public Integer getPrice() {
            return price;
        }
    }

    // 我們的「票券資料庫快取」
    private static final Map<String, TicketInfo> TICKET_CACHE = new HashMap<>();
    // 建立一個「景點 ID」對應「地區」的字典 (快取)
    private static final Map<String, String> PLACE_REGION_MAP = new HashMap<>();

    // 靜態初始化區塊：系統啟動時載入所有票券
    static {
        // --- 📍 景點門票 (Key 為 GooglePlaceId) ---
        TICKET_CACHE.put("ChIJr6UTdvlOGGART30L2LcRlmc", new TicketInfo("鏈鋸人 新江之島水族館門票", 500));
        TICKET_CACHE.put("ChIJ8VLVBuTsGGARfIDGqQDmC0Q", new TicketInfo("你的名字 須賀神社參拜套票", 500));
        TICKET_CACHE.put("ChIJP-vO9nuLGGARGJ2q8uryJUA", new TicketInfo("你的名字 國立新美術館門票", 400));
        TICKET_CACHE.put("ChIJscIAGGrzGGAROoW9kySUQYQ", new TicketInfo("孤獨搖滾！下北澤 Live House 體驗券", 800));
        TICKET_CACHE.put("ChIJvVsEzuVOGGARs99YuxNfbDU", new TicketInfo("孤獨搖滾！江之島 展望燈塔門票", 500));
        TICKET_CACHE.put("ChIJQSDrYJu4GGARD_broFBjNUM", new TicketInfo("幸運☆星 鷲宮神社參拜套票", 500));
        TICKET_CACHE.put("ChIJCcRjTTnKGGARLtY-7WEX5aI", new TicketInfo("幸運☆星 久喜市立鷲宮圖書館門票", 300));
        TICKET_CACHE.put("ChIJIRZ85hZPGGARffzavFo4QRk", new TicketInfo("灌籃高手 平交道拍照觀景台門票", 200));
        TICKET_CACHE.put("ChIJ___DnVrgCl8RruTc290c3p8", new TicketInfo("情書 北一硝子三號館門票", 200));
        TICKET_CACHE.put("ChIJNZSPr8LgCl8R_ro2ttgpg7U", new TicketInfo("情書 小樽天狗山滑雪場門票", 300));
        TICKET_CACHE.put("ChIJW_hH73EMAWAR3DLfYrSpmdA", new TicketInfo("神劍闖江湖 真人版 園城寺門票", 300));
        TICKET_CACHE.put("ChIJceHc0AmoAWARLsqeCrglA1o", new TicketInfo("神劍闖江湖 真人版 上賀茂神社門票", 300));
        TICKET_CACHE.put("ChIJA-xD_h4ORDURYiAz8lXTUeo", new TicketInfo("解憂雜貨店 昭和之町展示館門票", 300));
        TICKET_CACHE.put("ChIJX36g4vZFGGARGocG2lY-Gko", new TicketInfo("海街日記 成就院門票", 300));
        TICKET_CACHE.put("ChIJa52KgsWBEzURhgFh5S2SZVg", new TicketInfo("惡人 大瀨崎燈塔門票", 300));
        TICKET_CACHE.put("EhlQTTQzK0MzLCBZYW1hbmFzaGksIEphcGFuIiY6JAoKDRFQSBUVm7ikUhAKGhQKEgn1beWlPgAcYBHDJMaulw_CFw",
                new TicketInfo("搖曳露營 Hottarakashi 溫泉門票", 800));
        TICKET_CACHE.put(
                "EiNNSlg0K0hDLCBIYW1hbWF0c3UsIFNoaXp1b2thLCBKYXBhbiImOiQKCg0_o64UFdEEBVIQChoUChIJkZcH5S0WG2ARI_bt4jmbpGc",
                new TicketInfo("搖曳露營 渚園露營場門票", 1200));

        TICKET_CACHE.put(
                "EiJRODNSKzQyLCBOaXNoaW5vbWl5YSwgSHlvZ28sIEphcGFuIiY6JAoKDb3bthQVMUGrUBAKGhQKEgmLym3lqPQAYBFwWl1yeC2MwQ",
                new TicketInfo("涼宮春日的憂鬱 廣田神社門票", 400));

        // --- 🚆 交通票券 (Key 為我們自訂的 ID) ---
        TICKET_CACHE.put("TRANS_TOKYO_SUBWAY_24H", new TicketInfo("東京地鐵 24 小時券", 800));
        TICKET_CACHE.put("TRANS_TOKYO_SUBWAY_72H", new TicketInfo("東京地鐵 72 小時券", 1500));
        TICKET_CACHE.put("TRANS_SKYLINER", new TicketInfo("京成電鐵 Skyliner 單程票 (成田機場特快)", 2570));
        TICKET_CACHE.put("TRANS_JR_PASS_7D", new TicketInfo("JR Pass 全日本鐵路周遊券 7日", 5000));
        TICKET_CACHE.put("TRANS_OSAKA_AMAZING_1D", new TicketInfo("大阪周遊卡 1 日券", 2800));
        TICKET_CACHE.put("TRANS_KYOTO_BUS_1D", new TicketInfo("京都地下鐵・巴士 1 日券", 1100));
        TICKET_CACHE.put("TRANS_HAKONE_FREE_PASS", new TicketInfo("箱根周遊券 2 日", 6100));

        // --- 定義景點所屬地區 ---
        // 東京市區 (適合推東京地鐵券)
        PLACE_REGION_MAP.put("ChIJ8VLVBuTsGGARfIDGqQDmC0Q", "TOKYO"); // 你的名字 須賀神社
        PLACE_REGION_MAP.put("ChIJP-vO9nuLGGARGJ2q8uryJUA", "TOKYO"); // 你的名字 國立新美術館
        PLACE_REGION_MAP.put("ChIJscIAGGrzGGAROoW9kySUQYQ", "TOKYO"); // 孤獨搖滾 下北澤

        // 神奈川 / 江之島 (適合推特殊周遊券)
        PLACE_REGION_MAP.put("ChIJr6UTdvlOGGART30L2LcRlmc", "KANAGAWA"); // 鏈鋸人 新江之島水族館
        PLACE_REGION_MAP.put("ChIJvVsEzuVOGGARs99YuxNfbDU", "KANAGAWA"); // 孤獨搖滾 江之島
        PLACE_REGION_MAP.put("ChIJIRZ85hZPGGARffzavFo4QRk", "KANAGAWA"); // 灌籃高手 平交道

        // 關西地區 (京都、滋賀，適合推關西交通票)
        PLACE_REGION_MAP.put("ChIJW_hH73EMAWAR3DLfYrSpmdA", "KANSAI"); // 神劍闖江湖 三井寺
        PLACE_REGION_MAP.put("ChIJceHc0AmoAWARLsqeCrglA1o", "KANSAI"); // 神劍闖江湖 上賀茂神社
    }

    /**
     * 【邏輯】傳入 GooglePlaceId，判斷景點有沒有賣票
     */
    public TicketInfo getTicketByPlaceId(String googlePlaceId) {
        if (googlePlaceId == null || googlePlaceId.isEmpty()) {
            return null;
        }
        return TICKET_CACHE.get(googlePlaceId);
    }

    /**
     * 【邏輯】傳入自訂 TicketId，取得交通票或一般票券資訊
     */
    public TicketInfo getTicketById(String ticketId) {
        if (ticketId == null || ticketId.isEmpty()) {
            return null;
        }
        return TICKET_CACHE.get(ticketId);
    }

    /**
     * 【邏輯】根據行程景點，智慧推薦交通票！
     */
    public List<TicketInfo> recommendTransportTickets(List<MyMapEntity> planSpots) {
        List<TicketInfo> recommendedTickets = new ArrayList<>();
        if (planSpots == null || planSpots.isEmpty()) {
            return recommendedTickets;
        }

        Set<String> visitedRegions = new HashSet<>();

        // 收集行程涵蓋的地區
        for (MyMapEntity spot : planSpots) {
            String placeId = spot.getGooglePlaceId();
            String region = PLACE_REGION_MAP.get(placeId);
            if (region != null) {
                visitedRegions.add(region);
            }
        }

        // --- 根據地區觸發推薦規則 ---

        // 規則 A：有去東京，推東京地鐵券
        if (visitedRegions.contains("TOKYO")) {
            // 🌟 加上防呆機制，確保拿出來不是 null 才加進推薦清單
            TicketInfo tokyoTicket = getTicketById("TRANS_TOKYO_SUBWAY_24H");
            if (tokyoTicket != null)
                recommendedTickets.add(tokyoTicket);
        }

        // 規則 B：有去關西，推關西相關票券
        if (visitedRegions.contains("KANSAI")) {
            TicketInfo kyotoTicket = getTicketById("TRANS_KYOTO_BUS_1D");
            if (kyotoTicket != null)
                recommendedTickets.add(kyotoTicket);

            TicketInfo osakaTicket = getTicketById("TRANS_OSAKA_AMAZING_1D");
            if (osakaTicket != null)
                recommendedTickets.add(osakaTicket);
        }

        // 規則 C：跨區判斷，同時去東京跟關西，強推 JR Pass
        if (visitedRegions.contains("TOKYO") && visitedRegions.contains("KANSAI")) {
            TicketInfo jrPass = getTicketById("TRANS_JR_PASS_7D");
            if (jrPass != null)
                recommendedTickets.add(jrPass);
        }

        return recommendedTickets;
    }
}