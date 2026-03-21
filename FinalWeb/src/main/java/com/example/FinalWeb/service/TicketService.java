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

    /**
     * 地區 Enum (避免字串打錯)
     */
    public enum Region {
        TOKYO,
        KANAGAWA,
        KANSAI,
        HOKKAIDO,
        KYUSHU,
        MT_FUJI
    }

    /**
     * 取得該行程中，已經購買且結帳成功(綠界)的景點 ID (spotId) 列表
     */
    public List<Integer> getPurchasedSpotIds(Integer planId) {
        if (planId == null) {
            return new ArrayList<>();
        }
        return ordersRepo.findByMyPlan_MyPlanIdAndPayStatus(planId, "已付款").stream()
                .flatMap(order -> order.getOrderDetails().stream())
                .filter(detail -> detail.getMyMap() != null && detail.getMyMap().getSpotId() != null)
                .map(detail -> detail.getMyMap().getSpotId())
                .distinct() // 過濾重複的景點 ID
                .toList();
    }

    // 替換為 TicketDto
    private static final Map<String, TicketDto> TICKET_CACHE = new HashMap<>();
    private static final Map<String, Region> PLACE_REGION_MAP = new HashMap<>();
    static {
        // =========================
        // 🎫 景點門票
        // =========================
        addTicket("ChIJr6UTdvlOGGART30L2LcRlmc", "鏈鋸人 新江之島水族館門票", 500);
        addTicket("ChIJ8VLVBuTsGGARfIDGqQDmC0Q", "你的名字 須賀神社參拜套票", 500);
        addTicket("ChIJP-vO9nuLGGARGJ2q8uryJUA", "你的名字 國立新美術館門票", 400);
        addTicket("ChIJscIAGGrzGGAROoW9kySUQYQ", "孤獨搖滾！下北澤 Live House 體驗券", 800);
        addTicket("ChIJvVsEzuVOGGARs99YuxNfbDU", "孤獨搖滾！江之島 展望燈塔門票", 500);
        addTicket("ChIJQSDrYJu4GGARD_broFBjNUM", "幸運☆星 鷲宮神社參拜套票", 500);
        addTicket("ChIJCcRjTTnKGGARLtY-7WEX5aI", "幸運☆星 久喜市立鷲宮圖書館門票", 300);
        addTicket("ChIJIRZ85hZPGGARffzavFo4QRk", "灌籃高手 平交道拍照觀景台門票", 200);
        addTicket("ChIJ___DnVrgCl8RruTc290c3p8", "情書 北一硝子三號館門票", 200);
        addTicket("ChIJNZSPr8LgCl8R_ro2ttgpg7U", "情書 小樽天狗山滑雪場門票", 300);
        addTicket("ChIJW_hH73EMAWAR3DLfYrSpmdA", "神劍闖江湖 園城寺門票", 300);
        addTicket("ChIJceHc0AmoAWARLsqeCrglA1o", "神劍闖江湖 上賀茂神社門票", 300);
        addTicket("ChIJA-xD_h4ORDURYiAz8lXTUeo", "解憂雜貨店 昭和之町展示館門票", 300);
        addTicket("ChIJX36g4vZFGGARGocG2lY-Gko", "海街日記 成就院門票", 300);
        addTicket("ChIJa52KgsWBEzURhgFh5S2SZVg", "惡人 大瀨崎燈塔門票", 300);
        addTicket("EhlQTTQzK0MzLCBZYW1hbmFzaGksIEphcGFuIiY6JAoKDRFQSBUVm7ikUhAKGhQKEgn1beWlPgAcYBHDJMaulw_CFw",
                "搖曳露營 Hottarakashi 溫泉門票", 800);
        addTicket(
                "EiNNSlg0K0hDLCBIYW1hbWF0c3UsIFNoaXp1b2thLCBKYXBhbiImOiQKCg0_o64UFdEEBVIQChoUChIJkZcH5S0WG2ARI_bt4jmbpGc",
                "搖曳露營 渚園露營場門票", 1200);
        addTicket(
                "EiJRODNSKzQyLCBOaXNoaW5vbWl5YSwgSHlvZ28sIEphcGFuIiY6JAoKDb3bthQVMUGrUBAKGhQKEgmLym3lqPQAYBFwWl1yeC2MwQ",
                "涼宮春日的憂鬱 廣田神社門票", 400);

        // =========================
        // 🚆 交通票券
        // =========================
        addTicket("TRANS_TOKYO_SUBWAY_24H", "東京地鐵 24 小時券", 800);
        addTicket("TRANS_TOKYO_SUBWAY_72H", "東京地鐵 72 小時券", 1500);
        addTicket("TRANS_SKYLINER", "京成 Skyliner (成田機場)", 2570);
        addTicket("TRANS_JR_PASS_7D", "JR Pass 全日本 7日", 50000);
        addTicket("TRANS_OSAKA_AMAZING_1D", "大阪周遊卡 1 日", 2800);
        addTicket("TRANS_KYOTO_BUS_1D", "京都地下鐵巴士 1 日", 1100);
        addTicket("TRANS_ENOSHIMA_KAMAKURA", "江之島鎌倉周遊券", 1640);
        addTicket("TRANS_HAKONE_FREE_PASS", "箱根周遊券", 6100);
        addTicket("TRANS_FUJI_SHIZUOKA_MINI", "富士山靜岡 JR Pass", 5000);
        addTicket("TRANS_HOKKAIDO_PASS", "JR 北海道 5日券", 20000);
        addTicket("TRANS_KYUSHU_PASS", "JR 九州 3日券", 12000);

        // =========================
        // 🗺️ 景點地區對應
        // =========================
        addRegion("ChIJ8VLVBuTsGGARfIDGqQDmC0Q", Region.TOKYO);
        addRegion("ChIJP-vO9nuLGGARGJ2q8uryJUA", Region.TOKYO);
        addRegion("ChIJscIAGGrzGGAROoW9kySUQYQ", Region.TOKYO);
        addRegion("ChIJQSDrYJu4GGARD_broFBjNUM", Region.TOKYO);
        addRegion("ChIJCcRjTTnKGGARLtY-7WEX5aI", Region.TOKYO);

        addRegion("ChIJr6UTdvlOGGART30L2LcRlmc", Region.KANAGAWA);
        addRegion("ChIJvVsEzuVOGGARs99YuxNfbDU", Region.KANAGAWA);
        addRegion("ChIJIRZ85hZPGGARffzavFo4QRk", Region.KANAGAWA);
        addRegion("ChIJX36g4vZFGGARGocG2lY-Gko", Region.KANAGAWA);

        addRegion("ChIJW_hH73EMAWAR3DLfYrSpmdA", Region.KANSAI);
        addRegion("ChIJceHc0AmoAWARLsqeCrglA1o", Region.KANSAI);
        addRegion(
                "EiJRODNSKzQyLCBOaXNoaW5vbWl5YSwgSHlvZ28sIEphcGFuIiY6JAoKDb3bthQVMUGrUBAKGhQKEgmLym3lqPQAYBFwWl1yeC2MwQ",
                Region.KANSAI);

        addRegion("ChIJ___DnVrgCl8RruTc290c3p8", Region.HOKKAIDO);
        addRegion("ChIJNZSPr8LgCl8R_ro2ttgpg7U", Region.HOKKAIDO);

        addRegion("ChIJA-xD_h4ORDURYiAz8lXTUeo", Region.KYUSHU);
        addRegion("ChIJa52KgsWBEzURhgFh5S2SZVg", Region.KYUSHU);

        addRegion("EhlQTTQzK0MzLCBZYW1hbmFzaGksIEphcGFuIiY6JAoKDRFQSBUVm7ikUhAKGhQKEgn1beWlPgAcYBHDJMaulw_CFw",
                Region.MT_FUJI);
        addRegion(
                "EiNNSlg0K0hDLCBIYW1hbWF0c3UsIFNoaXp1b2thLCBKYXBhbiImOiQKCg0_o64UFdEEBVIQChoUChIJkZcH5S0WG2ARI_bt4jmbpGc",
                Region.MT_FUJI);
    }

    private static void addTicket(String id, String name, int price) {
        TICKET_CACHE.put(id, new TicketDto(id, name, price));
    }

    private static void addRegion(String placeId, Region region) {
        PLACE_REGION_MAP.put(placeId, region);
    }

    public TicketDto getTicketByPlaceId(String placeId) {
        if (placeId == null)
            return null;
        return TICKET_CACHE.get(placeId);
    }

    public TicketDto getTicketById(String ticketId) {
        if (ticketId == null)
            return null;
        return TICKET_CACHE.get(ticketId);
    }

    // 🌟 回傳型態替換為 List<TicketDto>
    public List<TicketDto> recommendTransportTickets(List<MyMapEntity> planSpots) {
        if (planSpots == null || planSpots.isEmpty()) {
            return Collections.emptyList();
        }

        Set<Region> visited = new HashSet<>();
        for (MyMapEntity spot : planSpots) {
            String placeId = spot.getGooglePlaceId();
            if (placeId == null)
                continue;

            Region region = PLACE_REGION_MAP.get(placeId);
            if (region != null) {
                visited.add(region);
            }
        }

        List<TicketDto> result = new ArrayList<>();
        // 規則 A：東京，推東京地鐵券
        if (visited.contains(Region.TOKYO)) {
            safeAddTicket(result, "TRANS_TOKYO_SUBWAY_24H");
            safeAddTicket(result, "TRANS_SKYLINER");
        }
        // 規則 B：神奈川，推江之島鎌倉周遊券
        if (visited.contains(Region.KANAGAWA)) {
            safeAddTicket(result, "TRANS_ENOSHIMA_KAMAKURA");
        }
        // 規則 C：關西，推京都巴士券＋大阪周遊卡
        if (visited.contains(Region.KANSAI)) {
            safeAddTicket(result, "TRANS_KYOTO_BUS_1D");
            safeAddTicket(result, "TRANS_OSAKA_AMAZING_1D");
        }
        // 規則 D：北海道，推北海道JR Pass
        if (visited.contains(Region.HOKKAIDO)) {
            safeAddTicket(result, "TRANS_HOKKAIDO_PASS");
        }
        // 規則 E：九州，推九州JR Pass
        if (visited.contains(Region.KYUSHU)) {
            safeAddTicket(result, "TRANS_KYUSHU_PASS");
        }
        // 規則 F：富士山，推富士山靜岡JR Pass＋箱根周遊券
        if (visited.contains(Region.MT_FUJI)) {
            safeAddTicket(result, "TRANS_FUJI_SHIZUOKA_MINI");
            safeAddTicket(result, "TRANS_HAKONE_FREE_PASS");
        }
        // 規則 G：東京＋關西，推JR Pass 7日
        if (visited.contains(Region.TOKYO) && visited.contains(Region.KANSAI)) {
            safeAddTicket(result, "TRANS_JR_PASS_7D");
        }

        return result;
    }

    private void safeAddTicket(List<TicketDto> list, String ticketId) {
        TicketDto ticket = getTicketById(ticketId);
        if (ticket != null) {
            list.add(ticket);
        }
    }

    /**
     * 取得「其他可選交通票」= 全部交通票 排除掉已被智慧推薦的
     */
    public List<TicketDto> getOtherTransportTickets(List<TicketDto> recommended) {
        // 把已推薦的 ticketId 收集成 Set，方便快速比對
        Set<String> recommendedIds = recommended.stream()
                .map(TicketDto::ticketId)
                .collect(Collectors.toSet());

        // 全部 TRANS_ 開頭的票，過濾掉已推薦的
        return TICKET_CACHE.entrySet().stream()
                .filter(e -> e.getKey().startsWith("TRANS_"))
                .filter(e -> !recommendedIds.contains(e.getKey()))
                .map(Map.Entry::getValue)
                .sorted(Comparator.comparing(TicketDto::ticketName)) // 字母排序，顯示整齊
                .collect(Collectors.toList());
    }
}
