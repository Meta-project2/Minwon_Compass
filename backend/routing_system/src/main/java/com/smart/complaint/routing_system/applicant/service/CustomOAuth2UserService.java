package com.smart.complaint.routing_system.applicant.service;

import java.util.Collections;
import java.util.Map;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import com.smart.complaint.routing_system.applicant.domain.UserRole;
import com.smart.complaint.routing_system.applicant.dto.OAuth2Attributes;
import com.smart.complaint.routing_system.applicant.entity.SocialAuth;
import com.smart.complaint.routing_system.applicant.entity.User;
import com.smart.complaint.routing_system.applicant.repository.SocialAuthRepository;
import com.smart.complaint.routing_system.applicant.repository.UserRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;
    private final SocialAuthRepository socialAuthRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        String userNameAttributeName = userRequest.getClientRegistration().getProviderDetails()
                .getUserInfoEndpoint().getUserNameAttributeName();

        // 기존 OAuth2Service에 있던 표준화 로직 활용
        OAuth2Attributes attributes = OAuth2Attributes.of(registrationId, userNameAttributeName,
                oAuth2User.getAttributes());

        // DB 저장 가로채기
        User user = socialAuthRepository.findByProviderAndProviderId(registrationId, attributes.id())
                .map(SocialAuth::getUser)
                .orElseGet(
                        () -> registerNewUser(registrationId, attributes.id(), attributes.email(), attributes.name()));

        // 최종 반환 (DB의 권한 반영)
        return new DefaultOAuth2User(
                Collections.singleton(new SimpleGrantedAuthority(user.getRole().name())),
                oAuth2User.getAttributes(),
                "naver".equals(registrationId) ? "response" : userNameAttributeName
        );
    }

    private User registerNewUser(String provider, String providerId, String email, String name) {
        User user = User.builder()
                .username(provider + "_" + providerId)
                .password("OAUTH_USER")
                .email(email)
                .displayName(name)
                .role(UserRole.CITIZEN)
                .build();

        // 1. 유저 저장
        User savedUser = userRepository.save(user);

        // 2. 소셜 정보 저장
        SocialAuth socialAuth = SocialAuth.builder()
                .user(savedUser)
                .provider(provider)
                .providerId(providerId)
                .build();
        socialAuthRepository.save(socialAuth);

        // 3. 반드시 저장된 유저 객체를 리턴해야 합니다! (이 부분이 누락되면 에러 발생)
        return savedUser;
    }

    private String extractProviderId(String provider, OAuth2User oAuth2User) {
        if (provider.equals("naver")) {
            Map<String, Object> response = (Map<String, Object>) oAuth2User.getAttributes().get("response");
            return (String) response.get("id");
        }
        // 카카오는 id가 최상위에 Long 타입으로 오는 경우가 많음
        return oAuth2User.getAttributes().get("id").toString();
    }

    private String extractEmail(String provider, OAuth2User oAuth2User) {
        if (provider.equals("naver")) {
            Map<String, Object> response = (Map<String, Object>) oAuth2User.getAttributes().get("response");
            return (String) response.get("email");
        }
        // 카카오는 kakao_account.email 구조
        Map<String, Object> kakaoAccount = (Map<String, Object>) oAuth2User.getAttributes().get("kakao_account");
        return (String) kakaoAccount.get("email");
    }

    private String extractName(String provider, OAuth2User oAuth2User) {
        if (provider.equals("naver")) {
            Map<String, Object> response = (Map<String, Object>) oAuth2User.getAttributes().get("response");
            return (String) response.get("name");
        }
        // 카카오는 kakao_account.profile.nickname 구조
        Map<String, Object> kakaoAccount = (Map<String, Object>) oAuth2User.getAttributes().get("kakao_account");
        Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");
        return (String) profile.get("nickname");
    }
}