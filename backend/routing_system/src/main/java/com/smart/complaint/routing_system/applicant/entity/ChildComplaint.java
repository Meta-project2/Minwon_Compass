package com.smart.complaint.routing_system.applicant.entity;

import com.smart.complaint.routing_system.applicant.domain.ComplaintStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "child_complaints")
@AllArgsConstructor
@Builder
public class ChildComplaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 부모 민원 연결
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_complaint_id")
    private Complaint parentComplaint;

    @Column(length = 200, nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String body;

    @Column(name = "answerd_by")
    private Long answeredBy;

    @Column(columnDefinition = "TEXT")
    private String answer;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "complaint_status")
    @Builder.Default
    private ComplaintStatus status = ComplaintStatus.RECEIVED;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    // 답변 임시 저장
    public void updateAnswerDraft(String draftAnswer) {
        this.answer = draftAnswer;
    }

    // 답변 완료
    public void completeAnswer(String finalAnswer, Long userId) {
        this.answer = finalAnswer;
        this.answeredBy = userId;
        this.status = ComplaintStatus.RESOLVED; // or CLOSED
        this.closedAt = LocalDateTime.now();
    }
}