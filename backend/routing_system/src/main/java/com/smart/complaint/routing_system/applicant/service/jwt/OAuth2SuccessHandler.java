package com.smart.complaint.routing_system.applicant.service.jwt;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    private final JwtTokenProvider tokenProvider;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        // OAuth2Service에서 설정한 속성들 추출
        String id = authentication.getName();
        String name = oAuth2User.getAttribute("name");

        // JWT 생성
        String token = tokenProvider.createJwtToken(name, id);

        System.out.println(token);

        // 프론트엔드(8000포트)로 토큰을 쿼리 스트링에 담아 리다이렉트
        String targetUrl = UriComponentsBuilder.fromUriString("http://localhost:8080/api/home")
                .queryParam("token", token)
                .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
