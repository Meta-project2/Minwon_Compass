package com.smart.complaint.routing_system.applicant.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Getter
@Table(name = "user_social_auths", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "provider", "provider_id" })
})
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class SocialAuth {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 여러 소셜 계정이 한 유저에게 연결될 수 있는 다대일(N:1) 관계
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 10)
    private String provider; // kakao, naver

    @Column(name = "provider_id", nullable = false)
    private String providerId; // 소셜 서버에서 주는 고유 ID

    @Column(name = "connected_at", updatable = false)
    private LocalDateTime connectedAt;

    @PrePersist
    protected void onCreate() {
        this.connectedAt = LocalDateTime.now();
    }
}