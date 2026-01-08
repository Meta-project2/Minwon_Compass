package com.smart.complaint.routing_system.applicant.entity;

import com.smart.complaint.routing_system.applicant.domain.ComplaintStatus;
import com.smart.complaint.routing_system.applicant.domain.UrgencyLevel;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "complaints") // [중요] DB 테이블 이름과 정확히 일치해야 함
@AllArgsConstructor
@Builder
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // BIGSERIAL 대응
    private Long id;

    @Column(name = "received_at", nullable = false) // DB는 snake_case, 자바는 camelCase
    private LocalDateTime receivedAt;

    @Column(length = 200, nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false) // PostgreSQL TEXT 타입 매핑
    private String body;

    // DB 컬럼명은 그대로 두고, 자바 변수명은 올바르게 수정해서 매핑
    @Column(name = "answerd_by")
    private Long answeredBy; // 일단 ID로 매핑 (추후 User Entity로 변경 권장)

    @Column(columnDefinition = "TEXT")
    private String answer;

    @Column(name = "address_text")
    private String addressText;

    // 위도, 경도 (DECIMAL 10,7)
    @Column(precision = 10, scale = 7)
    private BigDecimal lat;

    @Column(precision = 10, scale = 7)
    private BigDecimal lon;

    // District 객체를 바로 참조!
    @ManyToOne(fetch = FetchType.LAZY) // 실무 필수: 필요할 때만 조회 (성능 최적화)
    @JoinColumn(name = "district_id")  // DB의 fk 컬럼명 지정
    private District district;

    // Enum 매핑 (String으로 저장/조회)
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "complaint_status")
    @Builder.Default
    private ComplaintStatus status = ComplaintStatus.RECEIVED;

    @Enumerated(EnumType.STRING)
    @Column(name = "urgency", nullable = false, columnDefinition = "urgency_level")
    @Builder.Default
    private UrgencyLevel urgency = UrgencyLevel.MEDIUM;

    @Column(name = "current_department_id")
    private Long currentDepartmentId;

    @Column(name = "incident_id")
    private Long incidentId;

    @Column(name = "incident_linked_at")
    private LocalDateTime incidentLinkedAt;

    @Column(name = "incident_link_score", precision = 6, scale = 4)
    private BigDecimal incidentLinkScore;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;
}
