package com.smart.complaint.routing_system.applicant.dto;

import java.util.Map;

// response를 가져올 때 무조건 map 형태이기 때문에 suppress
@SuppressWarnings("unchecked")
// OAuth에서 사용되는 정보를 저장하는 record
public record OAuth2Attributes(Map<String, Object> attributes, String nameAttributeKey, String name, String email,
        String id) {
    public static OAuth2Attributes of(String registrationId, String userNameAttributeName,
            Map<String, Object> attributes) {
        if ("naver".equals(registrationId))
            return ofNaver(attributes);
        if ("kakao".equals(registrationId))
            return ofKakao(attributes);
        return null; // 혹은 기본 처리
    }

    private static OAuth2Attributes ofNaver(Map<String, Object> attributes) {
        Map<String, Object> response = (Map<String, Object>) attributes.get("response");
        return new OAuth2Attributes(
                attributes, // 전체 attributes를 유지하는 것이 좋음
                "id",
                (String) response.get("name"),
                (String) response.get("email"), // 네이버 이메일 추출
                (String) response.get("id"));
    }

    private static OAuth2Attributes ofKakao(Map<String, Object> attributes) {
        Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
        Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");

        String email = (kakaoAccount != null && kakaoAccount.get("email") != null) 
                   ? (String) kakaoAccount.get("email") 
                   : "NO_EMAIL";

        return new OAuth2Attributes(
                attributes,
                "id",
                (String) profile.get("nickname"),
                email, // 카카오 이메일 추출
                String.valueOf(attributes.get("id")));
    }
}