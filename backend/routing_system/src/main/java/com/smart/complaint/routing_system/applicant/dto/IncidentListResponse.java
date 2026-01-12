package com.smart.complaint.routing_system.applicant.dto;

import com.smart.complaint.routing_system.applicant.domain.IncidentStatus;
import com.smart.complaint.routing_system.applicant.entity.Incident;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.format.DateTimeFormatter;

@Data
@NoArgsConstructor
public class IncidentListResponse {

    private String id;              // 화면용 ID (I-2026-0001)
    private Long originalId;        // DB PK (상세 조회 클릭 시 필요)
    private String title;           // 사건 제목
    private IncidentStatus status;  // 사건 상태
    private Long complaintCount;    // 구성 민원 수 (계산된 값)
    private String openedAt;        // 최초 발생일 (String 포맷)

    // QueryDSL에서 Projections.constructor로 호출할 생성자
    public IncidentListResponse(Incident incident, Long complaintCount) {
        this.originalId = incident.getId();
        this.id = String.format("I-2026-%04d", incident.getId());
        this.title = incident.getTitle();
        this.status = incident.getStatus();
        this.complaintCount = complaintCount != null ? complaintCount : 0L;

        // 날짜 포맷팅 (yyyy-MM-dd HH:mm)
        this.openedAt = incident.getOpenedAt() != null
                ? incident.getOpenedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                : "";
    }
}