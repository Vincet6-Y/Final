package com.example.FinalWeb.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.FinalWeb.entity.MyMapEntity;
import com.example.FinalWeb.dto.TicketDto;
import com.example.FinalWeb.repo.OrdersRepo;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class TicketService {

    @Autowired
    private OrdersRepo ordersRepo;

    // =====================================================
    // 地區 Enum
    // =====================================================
    public enum Region {
        TOKYO, // 東京都
        KANAGAWA, // 神奈川（鎌倉、江之島、箱根）
        KANSAI, // 關西（京都、大阪）
        HOKKAIDO, // 北海道
        KYUSHU, // 九州
        MT_FUJI // 富士山靜岡
    }

    // =====================================================
    // 全日本通用票（固定 3 張，永遠顯示）
    // 日後只改這裡就好，不需動 HTML
    // =====================================================
    private static final List<String> GLOBAL_TICKET_IDS = List.of(
            "TRANS_JR_PASS_7D", // JR Pass 全日本 7日
            "TRANS_TOKYO_SUBWAY_24H", // 東京地鐵 24 小時券
            "TRANS_TOKYO_SUBWAY_72H" // 東京地鐵 72 小時券
    );

    // =====================================================
    // 票券快取 & 地區對應表
    // =====================================================
    private static final Map<String, TicketDto> TICKET_CACHE = new HashMap<>();

    // 景點 placeId → 地區（交通推薦 & 景點票推薦共用）
    private static final Map<String, Region> PLACE_REGION_MAP = new HashMap<>();

    // 景點 placeId → 門票（讓景點票也能依地區篩選）
    // Key: placeId, Value: TicketDto（與 TICKET_CACHE 共享同一個物件）
    private static final Map<String, Region> SPOT_TICKET_REGION_MAP = new HashMap<>();

    static {
        // ─────────────────────────────────────────────
        // 🎫 景點門票（placeId → 票券）
        // ─────────────────────────────────────────────

        // 東京
        addSpotTicket("ChIJd0dv2flfImAReSRXjnCvRVg", "你的名字 須賀神社參拜套票", 500, Region.TOKYO);
        addSpotTicket("ChIJmSYwCwCLGGARSzqhfSUeVks", "你的名字 國立新美術館門票", 400, Region.TOKYO);
        addSpotTicket("ChIJscIAGGrzGGAROoW9kySUQYQ", "孤獨搖滾！下北澤 Live House 體驗券", 800, Region.TOKYO);
        addSpotTicket("ChIJQSDrYJu4GGARD_broFBjNUM", "幸運☆星 鷲宮神社參拜套票", 500, Region.TOKYO);
        addSpotTicket("ChIJl6oO1zzKGGARJMJIYFN0Afk", "幸運☆星 久喜市立鷲宮圖書館門票", 300, Region.TOKYO);

        // 神奈川
        addSpotTicket("ChIJr6UTdvlOGGART30L2LcRlmc", "鏈鋸人 新江之島水族館門票", 500, Region.KANAGAWA);
        addSpotTicket("ChIJvVsEzuVOGGARs99YuxNfbDU", "孤獨搖滾！江之島 Sea Candle (展望燈塔)門票", 500, Region.KANAGAWA);
        addSpotTicket("ChIJIRZ85hZPGGARffzavFo4QRk", "灌籃高手 平交道拍照觀景台門票", 200, Region.KANAGAWA);
        addSpotTicket("ChIJX36g4vZFGGARGocG2lY-Gko", "海街日記 成就院（般若寺跡）門票", 300, Region.KANAGAWA);

        // 關西
        addSpotTicket("ChIJW_hH73EMAWAR3DLfYrSpmdA", "神劍闖江湖 園城寺門票", 300, Region.KANSAI);
        addSpotTicket("ChIJceHc0AmoAWARLsqeCrglA1o", "神劍闖江湖 上賀茂神社門票", 300, Region.KANSAI);
        addSpotTicket("ChIJY3kcPavzAGARZpbYdZ1CIX0", "涼宮春日的憂鬱 廣田神社門票", 400, Region.KANSAI);

        // 北海道
        addSpotTicket("ChIJ___DnVrgCl8RruTc290c3p8", "情書 星空咖啡廳門票", 200, Region.HOKKAIDO);
        addSpotTicket("ChIJNZSPr8LgCl8R_ro2ttgpg7U", "情書 小樽天狗山滑雪場門票", 300, Region.HOKKAIDO);
        addSpotTicket("ChIJ6aQkRqLznl8R1DmP_3dWsX0", "名偵探柯南 函館市青函連絡船記念館摩周丸門票", 100, Region.HOKKAIDO);
        addSpotTicket("ChIJeTIF-JL0nl8RLARltqS9BV8", "名偵探柯南 湯川溫泉門票", 1000, Region.HOKKAIDO);

        // 九州
        addSpotTicket("ChIJA-xD_h4ORDURYiAz8lXTUeo", "解憂雜貨店 昭和之町展示館門票", 300, Region.KYUSHU);
        addSpotTicket("ChIJa52KgsWBEzURhgFh5S2SZVg", "惡人 大瀨崎燈塔門票", 300, Region.KYUSHU);

        // 富士山 / 靜岡
        addSpotTicket("ChIJ57S8bif_G2AREga3oC82f2M", "搖曳露營 Hottarakashi 溫泉門票", 800, Region.MT_FUJI);
        addSpotTicket("ChIJBV-GeYrXGmARVQS_T1SlMLk", "搖曳露營 渚園露營場門票", 1200, Region.MT_FUJI);

        // ─────────────────────────────────────────────
        // 🚆 交通票券
        // ─────────────────────────────────────────────

        // 全日本通用（對應 GLOBAL_TICKET_IDS）
        addTicket("TRANS_JR_PASS_7D", "JR Pass 全日本 7日", 50000);
        addTicket("TRANS_TOKYO_SUBWAY_24H", "東京地鐵 24 小時券", 800);
        addTicket("TRANS_TOKYO_SUBWAY_72H", "東京地鐵 72 小時券", 1500);

        // 地區性交通票
        addTicket("TRANS_SKYLINER", "京成 Skyliner (成田機場)", 2570); // 東京
        addTicket("TRANS_ENOSHIMA_KAMAKURA", "江之島鎌倉周遊券", 1640); // 神奈川
        addTicket("TRANS_HAKONE_FREE_PASS", "箱根周遊券", 6100); // 神奈川
        addTicket("TRANS_KYOTO_BUS_1D", "京都地下鐵巴士 1 日", 1100); // 關西
        addTicket("TRANS_OSAKA_AMAZING_1D", "大阪周遊卡 1 日", 2800); // 關西
        addTicket("TRANS_FUJI_SHIZUOKA_MINI", "富士山靜岡 JR Pass", 5000); // 富士山
        addTicket("TRANS_HOKKAIDO_PASS", "JR 北海道 5日券", 20000); // 北海道
        addTicket("TRANS_KYUSHU_PASS", "JR 九州 3日券", 12000); // 九州
    }

    // =====================================================
    // 靜態工具方法（只在 static block 裡用）
    // =====================================================

    /** 新增景點門票，同時建立 placeId → Region 對應 */
    private static void addSpotTicket(String placeId, String name, int price, Region region) {
        TICKET_CACHE.put(placeId, new TicketDto(placeId, name, price));
        PLACE_REGION_MAP.put(placeId, region);
        SPOT_TICKET_REGION_MAP.put(placeId, region);
    }

    /** 新增交通票（無 placeId，只存快取） */
    private static void addTicket(String id, String name, int price) {
        TICKET_CACHE.put(id, new TicketDto(id, name, price));
    }

    // =====================================================
    // Public API
    // =====================================================

    /**
     * 根據 Google Place ID 取得景點門票
     */
    public TicketDto getTicketByPlaceId(String placeId) {
        if (placeId == null)
            return null;
        return TICKET_CACHE.get(placeId);
    }

    /**
     * 根據票券 ID 取得票券
     */
    public TicketDto getTicketById(String ticketId) {
        if (ticketId == null)
            return null;
        return TICKET_CACHE.get(ticketId);
    }

    /**
     * 取得該行程中，已經購買且結帳成功(綠界)的景點 ID (spotId) 列表
     */
    public List<Integer> getPurchasedSpotIds(Integer planId) {
        if (planId == null)
            return new ArrayList<>();
        return ordersRepo.findByMyPlan_MyPlanIdAndPayStatus(planId, "已付款").stream()
                .flatMap(order -> order.getOrderDetails().stream())
                .filter(detail -> detail.getMyMap() != null && detail.getMyMap().getSpotId() != null)
                .map(detail -> detail.getMyMap().getSpotId())
                .distinct()
                .toList();
    }

    /**
     * 取得全日本通用交通票（固定 3 張，永遠顯示）
     */
    public List<TicketDto> getGlobalTransportTickets() {
        return GLOBAL_TICKET_IDS.stream()
                .map(this::getTicketById)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    /**
     * 根據行程景點推薦「地區性」交通票
     * - 全日本通用票（GLOBAL_TICKET_IDS）不在這裡出現，避免重複
     * - 行程沒有對應地區 → 回傳空 List（前端不顯示此 optgroup）
     */
    public List<TicketDto> recommendTransportTickets(List<MyMapEntity> planSpots) {
        if (planSpots == null || planSpots.isEmpty())
            return Collections.emptyList();

        Set<Region> visited = detectRegions(planSpots);
        if (visited.isEmpty())
            return Collections.emptyList();

        List<TicketDto> result = new ArrayList<>();

        // 東京 → Skyliner
        if (visited.contains(Region.TOKYO)) {
            safeAdd(result, "TRANS_SKYLINER");
        }
        // 神奈川 → 江之島鎌倉周遊券、箱根周遊券
        if (visited.contains(Region.KANAGAWA)) {
            safeAdd(result, "TRANS_ENOSHIMA_KAMAKURA");
            safeAdd(result, "TRANS_HAKONE_FREE_PASS");
        }
        // 關西 → 京都巴士、大阪卡
        if (visited.contains(Region.KANSAI)) {
            safeAdd(result, "TRANS_KYOTO_BUS_1D");
            safeAdd(result, "TRANS_OSAKA_AMAZING_1D");
        }
        // 富士山 → 富士山靜岡 JR Pass
        if (visited.contains(Region.MT_FUJI)) {
            safeAdd(result, "TRANS_FUJI_SHIZUOKA_MINI");
        }
        // 北海道 → JR 北海道
        if (visited.contains(Region.HOKKAIDO)) {
            safeAdd(result, "TRANS_HOKKAIDO_PASS");
        }
        // 九州 → JR 九州
        if (visited.contains(Region.KYUSHU)) {
            safeAdd(result, "TRANS_KYUSHU_PASS");
        }

        return result;
    }

    /**
     * 根據行程景點推薦「景點門票」
     * - 只推薦行程內有對應景點的門票
     * - 已購買的票（purchasedNames）由前端透過 purchasedNames 過濾，這裡不重複處理
     */
    public List<TicketDto> recommendSpotTickets(List<MyMapEntity> planSpots) {
        if (planSpots == null || planSpots.isEmpty())
            return Collections.emptyList();

        return planSpots.stream()
                .map(spot -> getTicketByPlaceId(spot.getGooglePlaceId()))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    // =====================================================
    // 私有工具
    // =====================================================

    /** 從行程景點清單偵測涉及哪些地區 */
    private Set<Region> detectRegions(List<MyMapEntity> spots) {
        Set<Region> regions = new HashSet<>();
        for (MyMapEntity spot : spots) {
            if (spot.getGooglePlaceId() == null)
                continue;
            Region r = PLACE_REGION_MAP.get(spot.getGooglePlaceId());
            if (r != null)
                regions.add(r);
        }
        return regions;
    }

    private void safeAdd(List<TicketDto> list, String ticketId) {
        TicketDto t = getTicketById(ticketId);
        if (t != null)
            list.add(t);
    }
}