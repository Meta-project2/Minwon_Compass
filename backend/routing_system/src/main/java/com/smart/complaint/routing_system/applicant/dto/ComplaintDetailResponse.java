package com.smart.complaint.routing_system.applicant.dto;

import com.smart.complaint.routing_system.applicant.domain.ComplaintStatus;
import com.smart.complaint.routing_system.applicant.domain.IncidentStatus;
import com.smart.complaint.routing_system.applicant.domain.UrgencyLevel;
import com.smart.complaint.routing_system.applicant.entity.Complaint;
import com.smart.complaint.routing_system.applicant.entity.ComplaintNormalization;
import com.smart.complaint.routing_system.applicant.entity.Incident;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;

@Data
@NoArgsConstructor
public class ComplaintDetailResponse {
    // 1. 민원 기본 정보
    private String id;           // C2026-xxxx
    private Long originalId;     // DB PK
    private String title;
    private String body;         // 원문
    private String address;
    private String receivedAt;
    private ComplaintStatus status;
    private UrgencyLevel urgency;
    private String departmentName; // 담당 부서명 (없으면 미배정)
    private String category;       // 업무군

    // 2. 정규화(분석) 정보
    private String neutralSummary;
    private String coreRequest;
    private String coreCause;
    private String targetObject;
    private List<String> keywords; // JSON -> List 변환
    private String locationHint;

    // 3. 사건(군집) 정보
    private String incidentId;         // I-2026-xxxx
    private String incidentTitle;
    private IncidentStatus incidentStatus;
    private Long incidentComplaintCount;

    // 생성자: 조회된 엔티티들을 받아서 DTO 필드를 채움
    public ComplaintDetailResponse(Complaint c, ComplaintNormalization n, Incident i, Long incidentCount, String deptName) {
        // 기본 정보 매핑
        this.originalId = c.getId();
        this.id = String.format("C2026-%04d", c.getId());
        this.title = c.getTitle();
        this.body = c.getBody();
        this.address = c.getAddressText();
        this.receivedAt = c.getReceivedAt() != null
                ? c.getReceivedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                : "";
        this.status = c.getStatus();
        this.urgency = c.getUrgency();
        this.departmentName = deptName != null ? deptName : "미배정";
        this.category = "일반행정"; // 임시값 (부서 카테고리에 따라 로직 추가 가능)

        // 정규화 정보 매핑
        if (n != null) {
            this.neutralSummary = n.getNeutralSummary();
            this.coreRequest = n.getCoreRequest();
            this.coreCause = n.getCoreCause();
            this.targetObject = n.getTargetObject();
            this.locationHint = n.getLocationHint();

            // JSONB -> List<String> 변환 (안전하게 처리)
            if (n.getKeywordsJsonb() instanceof List) {
                this.keywords = (List<String>) n.getKeywordsJsonb();
            } else {
                this.keywords = Collections.emptyList();
            }
        } else {
            this.keywords = Collections.emptyList();
        }

        // 사건 정보 매핑
        if (i != null) {
            this.incidentId = String.format("I-2026-%04d", i.getId());
            this.incidentTitle = i.getTitle();
            this.incidentStatus = i.getStatus();
            this.incidentComplaintCount = incidentCount;
        }
    }
}