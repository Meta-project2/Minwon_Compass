package com.smart.complaint.routing_system.applicant.dto;

import com.smart.complaint.routing_system.applicant.domain.IncidentStatus;
import com.smart.complaint.routing_system.applicant.entity.Incident;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncidentListResponse {

    private String id;
    private Long originalId;
    private String title;
    private IncidentStatus status;
    private Integer complaintCount;
    private String openedAt;       // 최초 발생일
    private String lastOccurred;   // 최근 발생일

    // [수정] 리포지토리의 Projections.constructor와 순서 및 개수를 완벽히 일치시킵니다.
    public IncidentListResponse(Incident incident, Long complaintCount, LocalDateTime firstReceivedAt, LocalDateTime lastReceivedAt) {
        this.originalId = incident.getId();
        this.id = String.format("I-2026-%04d", incident.getId());
        this.title = incident.getTitle();
        this.status = incident.getStatus();
        this.complaintCount = complaintCount != null ? complaintCount.intValue() : 0;

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

        // DB 컬럼(openedAt)이 아닌, 군집 내 민원 중 가장 오래된 날짜를 우선 사용
        this.openedAt = firstReceivedAt != null
                ? firstReceivedAt.format(formatter)
                : (incident.getOpenedAt() != null ? incident.getOpenedAt().format(formatter) : "-");

        // 군집 내 민원 중 가장 최신 날짜 사용
        this.lastOccurred = lastReceivedAt != null
                ? lastReceivedAt.format(formatter)
                : "-";
    }
}