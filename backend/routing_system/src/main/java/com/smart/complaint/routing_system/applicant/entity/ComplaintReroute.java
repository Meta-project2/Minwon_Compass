package com.smart.complaint.routing_system.applicant.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "complaint_reroutes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ComplaintReroute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "complaint_id", nullable = false)
    private Complaint complaint;

    @Column(name = "origin_department_id", nullable = false)
    private Long originDepartmentId;

    @Column(name = "target_department_id", nullable = false)
    private Long targetDepartmentId;

    @Column(name = "request_reason", columnDefinition = "TEXT")
    private String requestReason;

    // "PENDING", "APPROVED", "REJECTED"
    @Column(length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "requester_id")
    private Long requesterId; // 요청자

    @Column(name = "reviewer_id")
    private Long reviewerId; // 승인자

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    // 승인/반려 처리 메서드
    public void process(String newStatus, Long reviewerId) {
        this.status = newStatus;
        this.reviewerId = reviewerId;
        this.completedAt = LocalDateTime.now();
    }
}