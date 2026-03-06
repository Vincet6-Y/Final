import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public class weather {
    public static void main(String[] args) {
        // 東京、大阪、沖繩座標
        String url = "https://api.open-meteo.com/v1/forecast?latitude=35.6895,34.6937,26.2124&longitude=139.6917,135.5023,127.6809&current=temperature_2m&daily=weather_code,temperature_2m_max,time&timezone=auto";

        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).GET().build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                ObjectMapper mapper = new ObjectMapper();
                JsonNode root = mapper.readTree(response.body());
                System.out.println("成功抓取三個城市數據，JSON 陣列長度: " + root.size());
            } else {
                System.out.println("錯誤：無法獲取資料，狀態碼：" + response.statusCode());
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}