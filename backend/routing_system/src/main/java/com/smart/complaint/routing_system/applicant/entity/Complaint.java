package com.smart.complaint.routing_system.applicant.entity;

import com.smart.complaint.routing_system.applicant.domain.ComplaintStatus;

import com.smart.complaint.routing_system.applicant.domain.Tag;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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

    @Column(name = "applicant_id")
    private Long applicantId;

    @Column(length = 200, nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false) // PostgreSQL TEXT 타입 매핑
    private String body;

//    @Enumerated(EnumType.STRING)
//    @Column(name = "tag", nullable = false, columnDefinition = "tag_type")
//    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
//    private Tag tag;

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
    @JoinColumn(name = "district_id") // DB의 fk 컬럼명 지정
    private District district;

    // Enum 매핑 (String으로 저장/조회)
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, columnDefinition = "complaint_status")
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Builder.Default
    private ComplaintStatus status = ComplaintStatus.RECEIVED;

    @Column(name = "current_department_id")
    private Long currentDepartmentId;

    // AI 최초 예측 부서 (성능 측정용)
    @Column(name = "ai_predicted_department_id")
    private Long aiPredictedDepartmentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id")
    private Incident incident;

    @Column(name = "incident_linked_at")
    private LocalDateTime incidentLinkedAt;

    @Column(name = "incident_link_score", precision = 6, scale = 4)
    private BigDecimal incidentLinkScore;

    @Column(name = "received_at", nullable = false) // DB는 snake_case, 자바는 camelCase
    private LocalDateTime receivedAt;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    // [신규] 자식 민원 리스트 추가 (OneToMany)
    // mappedBy는 ChildComplaint의 필드명 'parentComplaint'와 일치해야 함
    @Builder.Default
    @OneToMany(mappedBy = "parentComplaint", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @OrderBy("createdAt ASC")
    private List<ChildComplaint> childComplaints = new ArrayList<>();

    // 담당자 지정 (Assign)
    public void assignManager(Long managerId) {
        this.answeredBy = managerId;
        this.status = ComplaintStatus.IN_PROGRESS;
    }

    // 답변 임시 저장 (Draft)
    public void updateAnswerDraft(String draftAnswer) {
        this.answer = draftAnswer;
        // 상태는 변경하지 않음 (IN_PROGRESS 유지)
    }

    // 답변 완료 및 종결 (Complete)
    public void completeAnswer(String finalAnswer) {
        this.answer = finalAnswer;
        this.status = ComplaintStatus.RESOLVED;
        this.closedAt = LocalDateTime.now();
    }

    // 재이관 요청 시 상태 변경
    public void statusToReroute() {
        this.status = ComplaintStatus.RECOMMENDED; // 재이관 대기중 상태로 변경
    }

    // 재이관 승인 시 상태 초기화 (Reroute Approved)
    public void rerouteTo(Long newDepartmentId) {
        this.currentDepartmentId = newDepartmentId;
        this.answeredBy = null; // 담당자 초기화
        this.status = ComplaintStatus.RECEIVED; // 접수 상태로 복귀
    }

    // 담당자 배정 해제
    public void releaseManager() {
        this.answeredBy = null;
        this.status = ComplaintStatus.RECEIVED;
    }

    public void rejectReroute() {
        // 반려되면 다시 우리 부서의 '접수' 상태로
        this.status = ComplaintStatus.RECEIVED;
    }

    // [수정] 사건 방 이동을 가능하게 해주는 메서드 (Setter 대용)
    public void setIncident(Incident incident) {
        this.incident = incident;
        this.incidentLinkedAt = LocalDateTime.now(); // 이동한 시간 기록
    }

}