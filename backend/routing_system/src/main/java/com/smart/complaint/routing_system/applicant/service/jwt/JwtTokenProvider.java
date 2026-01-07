package com.smart.complaint.routing_system.applicant.service.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

@Component
public class JwtTokenProvider {
    
    // jwt 생성키
    @Value("${JWT_SECRET}")
    private String jwtSecret;
    // 토큰 유효 시간 - 30분
    private final Long tokenValidMilliSecs = 1000L * 30 * 60;

    private Key key;

    // 생성될때 단 한 번만
    @PostConstruct
    protected void init() {
        String secretKey;
        // 비밀 키의 문자열이 충분히 긴지 확인 - 안정성 검사
        this.key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    // JWT 생성
    public String createJwtToken(String name, String email) {
        // 토큰에 담을 정보: 이름, 이메일
        Claims claims = Jwts.claims().setSubject(name);
        claims.put("email", email);
        // 현재 시간
        Date now = new Date();
        return Jwts.builder()
                // 이름, 이메일 담기
                .setClaims(claims)
                // 발행 시간
                .setIssuedAt(now)
                // 만료 시간: 현재 시간 + 30분
                .setExpiration(new Date(now.getTime() + tokenValidMilliSecs))
                // 서명 방법 지정
                .signWith(key, SignatureAlgorithm.HS256)
                // 서명 후 압축 - String
                .compact();
    }

    // 토큰에서 유저 정보 추출
    public String getProviderId(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build()
                .parseClaimsJws(token).getBody().getSubject();
    }

    // 토큰 유효성 검증
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
