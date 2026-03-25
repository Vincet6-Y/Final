package com.example.FinalWeb;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import io.github.cdimascio.dotenv.Dotenv;


// 輸入即可以不用開啟資料庫並確認網頁版面
// import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;

@SpringBootApplication
// @SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})
public class FinalWebApplication {

	public static void main(String[] args) {
		// 載入 .env 檔案到系統環境變數
        Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();
        dotenv.entries().forEach(e -> 
            System.setProperty(e.getKey(), e.getValue())
        );
		SpringApplication.run(FinalWebApplication.class, args);
	}

}
