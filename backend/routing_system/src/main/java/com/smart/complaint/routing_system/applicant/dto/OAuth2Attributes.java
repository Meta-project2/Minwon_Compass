package com.smart.complaint.routing_system.applicant.dto;

import java.util.Map;

@SuppressWarnings("unchecked")
public record OAuth2Attributes(
        Map<String, Object> attributes,
        String nameAttributeKey,
        String name,
        String email,
        String id) {
    public static OAuth2Attributes of(String registrationId, String userNameAttributeName,
            Map<String, Object> attributes) {
        if ("naver".equals(registrationId)) {
            return ofNaver("id", attributes);
        }
        if ("kakao".equals(registrationId)) {
            return ofKakao("id", attributes);
        }
        return null;
    }

    private static OAuth2Attributes ofNaver(String nameAttributeKey, Map<String, Object> attributes) {
        Map<String, Object> response = (Map<String, Object>) attributes.get("response");

        return new OAuth2Attributes(
                response,
                nameAttributeKey,
                (String) response.get("name"),
                (String) response.get("email"),
                (String) response.get("id"));
    }

    private static OAuth2Attributes ofKakao(String nameAttributeKey, Map<String, Object> attributes) {
        Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
        Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");

        String email = (kakaoAccount != null && kakaoAccount.get("email") != null)
                ? (String) kakaoAccount.get("email")
                : "NO_EMAIL";

        return new OAuth2Attributes(
                attributes,
                nameAttributeKey,
                (String) profile.get("nickname"),
                email,
                String.valueOf(attributes.get("id")));
    }
}