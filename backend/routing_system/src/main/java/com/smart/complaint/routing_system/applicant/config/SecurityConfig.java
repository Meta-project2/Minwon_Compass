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
import org.springframework.web.client.RestTemplate;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.smart.complaint.routing_system.applicant.service.jwt.JwtAuthenticationFilter;
import com.smart.complaint.routing_system.applicant.service.jwt.JwtTokenProvider;
import com.smart.complaint.routing_system.applicant.service.jwt.OAuth2Service;
import com.smart.complaint.routing_system.applicant.service.jwt.OAuth2SuccessHandler;

import jakarta.servlet.http.HttpServletResponse;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

        private final OAuth2Service oAuth2Service;
        private final OAuth2SuccessHandler oAuth2SuccessHandler;
        private final JwtTokenProvider jwtTokenProvider;

        @Bean
        public RestTemplate restTemplate() {
                return new RestTemplate();
        }

        @Bean
        public PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }

        @Bean
        public WebSecurityCustomizer webSecurityCustomizer() {
                return (web) -> web.ignoring()
                                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html",
                                                "/favicon.ico");
        }

        // [1] 공무원 전용 (세션 방식)
        @Bean
        @Order(1)
        public SecurityFilterChain agentFilterChain(HttpSecurity http) throws Exception {
                http
                                .securityMatcher("/api/agent/**", "/api/admin/**")
                                .csrf(csrf -> csrf.disable())
                                .cors(cors -> cors.configurationSource(corsConfigurationSource())) // ★ 통일
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers("/api/agent/login").permitAll()
                                                .anyRequest().hasAnyRole("AGENT", "ADMIN"))
                                // ★ 중요: 인증 실패 시 리다이렉트 대신 401 응답 (로그에 /login 찍히는 현상 방지)
                                .exceptionHandling(ex -> ex
                                                .authenticationEntryPoint((request, response, authException) -> response
                                                                .sendError(HttpServletResponse.SC_UNAUTHORIZED,
                                                                                "Unauthorized")));

                return http.build();
        }

        // [2] 시민/공용 (JWT 방식)
        @Bean
        @Order(2)
        public SecurityFilterChain publicFilterChain(HttpSecurity http) throws Exception {
                http
                                .securityMatcher("/**")
                                .csrf(csrf -> csrf.disable())
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers("/api/auth/**", "/oauth2/**", "/login/oauth2/**")
                                                .permitAll()
                                                .requestMatchers("/api/applicant/signup", "/api/applicant/check-id",
                                                                "/api/applicant/login", "/api/applicant/userinfo",
                                                                "/api/applicant/newpw",
                                                                "/api/applicant/complaints/top3",
                                                                "/api/applicant/heatmap")
                                                .permitAll()
                                                .requestMatchers("/api/applicant/**").authenticated()
                                                .anyRequest().authenticated())
                                .oauth2Login(oauth2 -> oauth2
                                                .successHandler(oAuth2SuccessHandler)
                                                .userInfoEndpoint(userInfo -> userInfo.userService(oAuth2Service)))
                                .logout(logout -> logout
                                                .logoutUrl("/logout")
                                                .logoutSuccessUrl("/login")
                                                .invalidateHttpSession(true)
                                                .deleteCookies("JSESSIONID"))
                                // JWT 필터 삽입
                                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider),
                                                UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();
                configuration.addAllowedOrigin("http://localhost:5173");
                configuration.addAllowedOrigin("http://127.0.0.1:5173"); // ★ 127.0.0.1 도 추가 권장
                configuration.addAllowedMethod("*");
                configuration.addAllowedHeader("*");
                configuration.setAllowCredentials(true);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);
                return source;
        }
}