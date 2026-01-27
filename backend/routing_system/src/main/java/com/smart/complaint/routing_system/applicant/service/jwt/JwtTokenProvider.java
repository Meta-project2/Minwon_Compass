package com.smart.complaint.routing_system.applicant.service.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

@Component
@Slf4j
public class JwtTokenProvider {

    @Value("${JWT_SECRET}")
    private String jwtSecret;
    private final Long tokenValidMilliSecs = 1000L * 30 * 60;
    private Key key;

    @PostConstruct
    protected void init() {
        this.key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public String createJwtToken(String name, String email) {
        if (name == null) {
            log.error("CRITICAL: 토큰 생성 중 name(Subject)이 null입니다! 이메일: {}", email);
            name = email;
        }
        Claims claims = Jwts.claims().setSubject(name);
        log.info("JWT 토큰 생성 대상 사용자: " + name + ", 이메일: " + email);
        claims.put("email", email);
        Date now = new Date();
        return Jwts.builder()
                .setClaims(claims)
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + tokenValidMilliSecs))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String getProviderId(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build()
                .parseClaimsJws(token).getBody().getSubject();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
