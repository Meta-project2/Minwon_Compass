package com.smart.complaint.routing_system.applicant.security;

import com.smart.complaint.routing_system.applicant.service.Jwt.JwtAuthenticationFilter;
import com.smart.complaint.routing_system.applicant.service.Jwt.JwtTokenProvider;
import com.smart.complaint.routing_system.applicant.service.Jwt.OAuth2Service;
import com.smart.complaint.routing_system.applicant.service.Jwt.OAuth2SuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final OAuth2Service oAuth2Service;
    private final OAuth2SuccessHandler successHandler;
    private final JwtTokenProvider jwtTokenProvider;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // API 사용하기 때문에 비활성화
                .csrf(csrf -> csrf.disable())
                // jwt를 사용할거기 때문에 세션 설정을 off
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // 로그인 하지 않은 사용자도 아래 url에는 접근을 허용
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/", "/login/**", "/agent/**").permitAll()
                        .anyRequest().authenticated()
                )
                .oauth2Login(oauth2 -> oauth2
                        // 로그인 성공 시 이동
                        .successHandler(successHandler)
                        .userInfoEndpoint(userInfo -> userInfo.userService(oAuth2Service))
                )
                .logout(logout -> logout
                        .logoutUrl("/logout") // 로그아웃을 처리할 URL (기본값이 /logout 이라 생략 가능)
                        .logoutSuccessUrl("/login") // 로그아웃 성공 시 이동할 페이지
                        .invalidateHttpSession(true) // HTTP 세션 삭제
                        .deleteCookies("JSESSIONID") // 세션 쿠키 삭제
                )
                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
