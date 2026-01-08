package com.smart.complaint.routing_system.applicant.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "complaints")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime receivedAt;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    private Long answeredBy; // 필요 시 User 엔티티와 연관관계 설정 가능

    @Column(columnDefinition = "TEXT")
    private String answer;

    @Column(length = 255)
    private String addressText;

    @Column(precision = 10, scale = 7)
    private BigDecimal lat;

    @Column(precision = 10, scale = 7)
    private BigDecimal lon;

    private Integer districtId; // 필요 시 District 엔티티와 연관관계 설정

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ComplaintStatus status = ComplaintStatus.RECEIVED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private UrgencyLevel urgency = UrgencyLevel.MEDIUM;

    private Long currentDepartmentId;

    private Long incidentId;

    private LocalDateTime incidentLinkedAt;

    @Column(precision = 6, scale = 4)
    private BigDecimal incidentLinkScore;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    private LocalDateTime closedAt;
}
