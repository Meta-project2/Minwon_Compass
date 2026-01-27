package com.smart.complaint.routing_system.applicant.service.jwt;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    private final JwtTokenProvider tokenProvider;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        Map<String, Object> attributes = oAuth2User.getAttributes();

        String name = "";

        // 1. 네이버인지 확인 (CustomOAuth2UserService에서 response로 넘겼기 때문)
        if (attributes.containsKey("response")) {
            Map<String, Object> responseMap = (Map<String, Object>) attributes.get("response");
            name = (String) responseMap.get("name");
        }
        // 2. 카카오인 경우 (일반적으로 name 또는 properties 내부에 존재)
        else if (attributes.containsKey("properties")) {
            Map<String, Object> properties = (Map<String, Object>) attributes.get("properties");
            name = (String) properties.get("nickname");
        }
        // 3. 구글 등 기타
        else {
            name = oAuth2User.getAttribute("name");
        }

        if (name == null)
            name = "사용자"; // 방어 코드

        String id = authentication.getName();
        String token = tokenProvider.createJwtToken(name, id);
        String targetUrl = UriComponentsBuilder.fromUriString(frontendUrl) // .env의 FRONTEND_URL 값
                .path("/applicant/login-success") // 경로 추가 (자동으로 / 처리)
                .queryParam("token", token)
                .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}