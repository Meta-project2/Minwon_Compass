package com.smart.complaint.routing_system.applicant.dto;

import com.smart.complaint.routing_system.applicant.domain.ComplaintStatus;
import com.smart.complaint.routing_system.applicant.domain.IncidentStatus;
import com.smart.complaint.routing_system.applicant.domain.UrgencyLevel;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class IncidentDetailResponse {

    private String id;
    private String title;
    private IncidentStatus status;
    private String district;
    private String firstOccurred;
    private String lastOccurred;
    private int complaintCount;
    private String avgProcessTime;
    private List<IncidentComplaintDto> complaints;

    @Data
    @Builder
    public static class IncidentComplaintDto {
        private String id;
        private Long originalId;
        private String title;
        private String receivedAt;
        private UrgencyLevel urgency;
        private ComplaintStatus status;
    }
}