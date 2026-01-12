package com.smart.complaint.routing_system.applicant.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer; // ★ 스웨거용
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.smart.complaint.routing_system.applicant.service.jwt.JwtAuthenticationFilter;
import com.smart.complaint.routing_system.applicant.service.jwt.JwtTokenProvider;
import com.smart.complaint.routing_system.applicant.service.jwt.OAuth2Service;
import com.smart.complaint.routing_system.applicant.service.jwt.OAuth2SuccessHandler;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
@Profile("!dev")
public class SecurityConfig {

    //*******CORS를 켜고, CorsConfigurationSource 필요******


    private final OAuth2Service oAuth2Service;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;
    private final JwtTokenProvider jwtTokenProvider;

    // 비밀번호 암호화 도구
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // Swagger 등 정적 리소스는 보안 필터 아예 거치지 않게 무시
    // 개발 완료후 application.yaml Swagger off
    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return (web) -> web.ignoring()
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html");
    }

    // 공무원 전용 (세션 방식)
    @Bean
    @Order(1)
    public SecurityFilterChain agentFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/api/agent/**") // ★ 이 주소만 담당
                .csrf(csrf -> csrf.disable())     // 개발 편의상 일단 끔 (나중에 켜도 됨)
                .cors(cors -> cors.configure(http))

                // ★ 핵심: 공무원은 세션(Session)을 쓴다!
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED) // 필요하면 세션 생성
                )

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/agent/login").permitAll() // 로그인은 누구나 접속 가능
                        .anyRequest().hasAnyRole("AGENT", "ADMIN")
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // ★ 5173 포트로 수정 (referer 헤더와 일치시켜야 함)
        configuration.addAllowedOrigin("http://localhost:5173"); 
        configuration.addAllowedMethod("*");
        configuration.addAllowedHeader("*");
        configuration.setAllowCredentials(true);
    
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    // 시민/공용 (JWT 방식) - 나머지 전부 담당
    @Bean
    @Order(2)
    public SecurityFilterChain publicFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/api/auth/**", "/api/complaint/**", "/**") // 나머지 API들
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // .cors(cors -> cors.configure(http))

                // 시민은 세션을 안 쓴다 (Stateless) ->  JWT 필터 들어갈 곳
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/validate").authenticated()
                        .requestMatchers("/api/auth/**").permitAll()
                        .anyRequest().authenticated()
                )

                .oauth2Login(oauth2 -> oauth2
                        // 로그인 성공 시 이동
                        .successHandler(oAuth2SuccessHandler)
                        .userInfoEndpoint(userInfo -> userInfo.userService(oAuth2Service))
                )
                .logout(logout -> logout
                        .logoutUrl("/logout") // 로그아웃을 처리할 URL (기본값이 /logout 이라 생략 가능)
                        .logoutSuccessUrl("/login") // 로그아웃 성공 시 이동할 페이지
                        .invalidateHttpSession(true) // HTTP 세션 삭제
                        .deleteCookies("JSESSIONID") // 세션 쿠키 삭제
                )
                //추후 JwtFilter가 오면 여기에
                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}