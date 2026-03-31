package com.example.FinalWeb.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
// 加入這個 Import，才能直接使用 CrossOriginOpenerPolicy.SAME_ORIGIN_ALLOW_POPUPS
import org.springframework.security.web.header.writers.CrossOriginOpenerPolicyHeaderWriter.CrossOriginOpenerPolicy;

@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity httpSecurity) throws Exception { // 這裡通常需要 throws Exception
        httpSecurity
                // 加上這一行，告訴警衛先不要檢查 CSRF Token
                .csrf(csrf -> csrf.disable())
                
                // === 💡 這裡是新增的 COOP 標頭設定區塊 ===
                .headers(headers -> headers
                        .crossOriginOpenerPolicy(coop -> coop
                                // 將政策放寬，允許同源網頁與彈出視窗進行通訊
                                .policy(CrossOriginOpenerPolicy.UNSAFE_NONE)
                        )
                )
                // ==========================================

                .authorizeHttpRequests(
                        auth -> auth.requestMatchers("/backend/**").hasRole("ADMIN")
                                // .requestMatchers("/main/**").hasAnyRole("ADMIN", "USER")
                                .requestMatchers("/**", "/article/**", "/article_img/**", "/assets/**", "/images/**", "/member/**", "/news/**", "/payment/**", "/tour/**", "/js/**", "/api/**", "/page403").permitAll()
                                .anyRequest().authenticated())
                // .formLogin(form -> form.loginPage("/auth")
                //         .usernameParameter("email")
                //         .passwordParameter("passwd")
                //         // .loginProcessingUrl("/auth/login")
                //         .defaultSuccessUrl("/")
                //         .failureUrl("/auth?error")
                //         // .permitAll())
                .logout(logout -> logout.logoutUrl("/logout")
                        .logoutSuccessUrl("/home")
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID"))
                .exceptionHandling(e -> e.accessDeniedPage("/page403"));

        // 上方式設定，設定完再 Build 才是完成
        return httpSecurity.build();
    }

    @Bean
    public PasswordEncoder encoder() {
        return new BCryptPasswordEncoder();
    }
}