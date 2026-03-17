package com.example.FinalWeb.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity httpSecurity) {
        httpSecurity
        // 加上這一行，告訴警衛先不要檢查 CSRF Token
                .csrf(csrf -> csrf.disable())
        .authorizeHttpRequests(
                auth -> auth.requestMatchers("/backend/**").hasRole("ADMIN")
                        // .requestMatchers("/main/**").hasAnyRole("ADMIN", "USER")
                        .requestMatchers("/**", "/article/**", "/article_img/**", "/assets/**", "/images/**", "/member/**", "/news/**", "/payment/**", "/tour/**", "/js/**", "/api/**").permitAll()
                        .anyRequest().authenticated())
                .formLogin(form -> form.loginPage("/auth")
                        .usernameParameter("email")
                        .passwordParameter("passwd")
                        .loginProcessingUrl("/doLogin")
                        .defaultSuccessUrl("/main")
                        .failureUrl("/login?error")
                        .permitAll())
                .logout(logout -> logout.logoutUrl("/logout")
                        .logoutSuccessUrl("/login?logout")
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID"))
                .exceptionHandling(e -> e.accessDeniedPage("/page403"));

        // 上方式設定，設定完再 Build 才是完成
        return httpSecurity.build();
    }

    @Bean
    public AuthenticationManager authorizationManager(AuthenticationConfiguration config) {
        return config.getAuthenticationManager();
    }
}
