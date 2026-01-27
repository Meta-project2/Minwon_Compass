package com.smart.complaint.routing_system.applicant.dto;

import com.smart.complaint.routing_system.applicant.domain.ComplaintStatus;
import com.smart.complaint.routing_system.applicant.domain.UrgencyLevel;
import com.smart.complaint.routing_system.applicant.entity.Complaint;
import lombok.Data;
import java.time.format.DateTimeFormatter;

@Data
public class ComplaintResponse {
    private String id;
    private Long originalId;
    private String title;
    private String address;
    private String receivedAt;
    private ComplaintStatus status;
    private UrgencyLevel urgency;
    private String incidentId;
    private String neutralSummary;
    private String coreRequest;
    private String managerName;

    public ComplaintResponse(Complaint complaint) {
        this.originalId = complaint.getId();
        this.id = String.format("C2026-%04d", complaint.getId());
        this.title = complaint.getTitle();
        this.address = complaint.getAddressText();
        this.receivedAt = complaint.getReceivedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
        this.status = complaint.getStatus();

        if (complaint.getIncident() != null) {
            this.incidentId = String.format("I-2026-%04d", complaint.getIncident().getId());
        }
    }
}