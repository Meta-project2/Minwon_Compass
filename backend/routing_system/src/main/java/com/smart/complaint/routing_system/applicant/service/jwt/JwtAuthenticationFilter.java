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

// 요청 한 번 마다 확인할 수 있도록 요청
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Authorization 헤더를 가져온다
        String bearerToken = request.getHeader("Authorization");
        String token = null;

        String path = request.getRequestURI();

        // 로그를 찍어 현재 어떤 주소가 들어오는지 확인해보세요.
        System.out.println("Request Path: " + path);

        // 공무원 API 경로는 JWT 검사를 아예 하지 않음
        if (path.startsWith("/api/agent/")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 위에서 추출한 부분이 유효한 문자열인지, Bearer로 시작을 하는지 확인하고 token만 분리
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            token = bearerToken.substring(7);
        }

        if (token != null && jwtTokenProvider.validateToken(token)) {
            /*
             * System.out.println("토큰 검증 성공, 유저 정보 추출 시작...");
             * String providerId = jwtTokenProvider.getProviderId(token);
             * 
             * // 유저 정보를 담은 인증 객체 생성
             * Authentication auth = new UsernamePasswordAuthenticationToken(providerId,
             * null,
             * Collections.singleton(new SimpleGrantedAuthority("ROLE_USER")));
             * 
             * SecurityContextHolder.getContext().setAuthentication(auth);
             */

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
