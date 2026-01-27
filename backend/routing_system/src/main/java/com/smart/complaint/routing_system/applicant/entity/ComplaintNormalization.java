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

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "keywords_jsonb", columnDefinition = "jsonb")
    private Object keywordsJsonb;

    @Column(length = 255)
    private String locationHint;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "routing_rank", columnDefinition = "jsonb")
    private Object routingRank;

    @Column(name = "embedding", columnDefinition = "vector(1024)")
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private float[] embedding;

    @Builder.Default
    private Boolean isCurrent = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
