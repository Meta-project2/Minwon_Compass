package com.smart.complaint.routing_system.applicant.service.jwt;

import com.smart.complaint.routing_system.applicant.dto.OAuth2Attributes;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class OAuth2Service extends DefaultOAuth2UserService {

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        // 어느 서비스인지 구분 (naver, kakao 등)
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        // 서비스별 유저 식별자 키 (id, response 등)
        String userNameAttributeName = userRequest.getClientRegistration().getProviderDetails().getUserInfoEndpoint().getUserNameAttributeName();

        // 데이터 표준화
        OAuth2Attributes attributes = OAuth2Attributes.of(registrationId, userNameAttributeName, oAuth2User.getAttributes());

        // 현재는 로그만
        System.out.println("로그인 유저 이메일: " + attributes.id());
        System.out.println("로그인 유저 이름: " + attributes.name());

        return new DefaultOAuth2User(
                Collections.singleton(new SimpleGrantedAuthority("ROLE_USER")),
                attributes.attributes(),
                attributes.nameAttributeKey()
        );
    }
}
