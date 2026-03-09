package com.example.FinalWeb;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// 輸入即可以不用開啟資料庫並確認網頁版面
// import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;

@SpringBootApplication
// @SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})
public class FinalWebApplication {

	public static void main(String[] args) {
		SpringApplication.run(FinalWebApplication.class, args);
	}

}
