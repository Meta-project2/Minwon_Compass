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
    private String openedAt;
    private String lastOccurred;

    public IncidentListResponse(Incident incident, Long complaintCount, LocalDateTime firstReceivedAt,
            LocalDateTime lastReceivedAt) {
        this.originalId = incident.getId();
        this.id = String.format("I-2026-%04d", incident.getId());
        this.title = incident.getTitle();
        this.status = incident.getStatus();
        this.complaintCount = complaintCount != null ? complaintCount.intValue() : 0;

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

        this.openedAt = firstReceivedAt != null
                ? firstReceivedAt.format(formatter)
                : (incident.getOpenedAt() != null ? incident.getOpenedAt().format(formatter) : "-");

        this.lastOccurred = lastReceivedAt != null
                ? lastReceivedAt.format(formatter)
                : "-";
    }
}