package com.smart.complaint.routing_system.applicant.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;

@Entity
@Table(name = "complaint_normalizations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ComplaintNormalization {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 200)
    private String respDept;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "complaint_id", nullable = false)
    private Complaint complaint;

    private Integer districtId;

    @Column(columnDefinition = "TEXT")
    private String neutralSummary;

    @Column(columnDefinition = "TEXT")
    private String coreRequest;

    @Column(columnDefinition = "TEXT")
    private String coreCause;

    @Column(length = 120)
    private String targetObject;

    // Hibernate 6 이상에서는 JSONB를 아래와 같이 간단히 매핑 가능합니다.
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "keywords_jsonb", columnDefinition = "jsonb")
    private Object keywordsJsonb; // Map<String, Object> 또는 특정 DTO로 변경 가능

    @Column(length = 255)
    private String locationHint;

    // AI 라우팅 추천 결과 (JSON)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "routing_rank", columnDefinition = "jsonb")
    private Object routingRank;

    // pgvector (1024차원) 매핑
    // Hibernate 6에서 vector 타입을 double[]로 처리하기 위한 설정
    @Column(name = "embedding", columnDefinition = "vector(1024)")
    private double[] embedding;

    @Builder.Default
    private Boolean isCurrent = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
