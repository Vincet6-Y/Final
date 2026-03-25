# ========== 第一階段：大廚房烹飪期 (打包編譯) ==========
# 呼叫一個內建 Maven 與 Java 17 工具的大型貨櫃
FROM maven:3.8.5-openjdk-17 AS builder

# 走進貨櫃裡，建立一個名為 /app 的工作區域
WORKDIR /app

# 把你電腦裡的 pom.xml 與 src 原始碼資料夾，搬進貨櫃的 /app 裡
COPY pom.xml .
COPY src ./src

# 下達指令：用 Maven 開始熬煮打包 (加上 -DskipTests 跳過測試，讓部署快一點)
RUN mvn clean package -DskipTests


# ========== 第二階段：輕量化出餐期 (執行環境) ==========
# 呼叫一個只有 Java 17 執行環境的輕量級小貨櫃
FROM eclipse-temurin:17-jre-alpine

# 走進小貨櫃裡，一樣建立一個 /app 的工作區域
WORKDIR /app

# 關鍵步驟：去剛剛的「大廚房 (builder)」裡，把 target 資料夾下煮好的 .jar 成品撈過來，並改名叫 app.jar
COPY --from=builder /app/target/*.jar app.jar

# 告訴 Render，當這個小貨櫃啟動時，請執行這行指令來開門營業
ENTRYPOINT ["java", "-jar", "app.jar"]