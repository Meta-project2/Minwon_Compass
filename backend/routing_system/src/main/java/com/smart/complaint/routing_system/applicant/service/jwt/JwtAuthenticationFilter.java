package com.smart.complaint.routing_system.applicant.service.jwt;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String bearerToken = request.getHeader("Authorization");
        String token = null;

        String path = request.getRequestURI();

        if (path.startsWith("/api/agent/")) {
            filterChain.doFilter(request, response);
            return;
        }

        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            token = bearerToken.substring(7);
        }

        if (token != null && jwtTokenProvider.validateToken(token)) {
            try {
                System.out.println("토큰 검증 성공, 유저 정보 추출 시작...");
                String providerId = jwtTokenProvider.getProviderId(token);
                System.out.println("추출된 providerId: " + providerId);

                Authentication auth = new UsernamePasswordAuthenticationToken(providerId, null,
                        Collections.singleton(new SimpleGrantedAuthority("ROLE_USER")));

                SecurityContextHolder.getContext().setAuthentication(auth);
                System.out.println("SecurityContext에 인증 객체 저장 완료!");
            } catch (Exception e) {
                System.err.println("인증 객체 생성 중 에러 발생: " + e.getMessage());
                e.printStackTrace();
            }
        }

        filterChain.doFilter(request, response);
    }
}
