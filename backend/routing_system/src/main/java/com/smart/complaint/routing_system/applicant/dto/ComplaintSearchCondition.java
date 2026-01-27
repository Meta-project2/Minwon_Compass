package com.smart.complaint.routing_system.applicant.dto;

import com.smart.complaint.routing_system.applicant.domain.ComplaintStatus;
import com.smart.complaint.routing_system.applicant.domain.UrgencyLevel;
import lombok.Data;

@Data
public class ComplaintSearchCondition {

    private String keyword;
    private ComplaintStatus status;
    private UrgencyLevel urgency;
    private Boolean hasIncident;
    private Boolean hasTags;
    private String sort = "latest";
    private Integer page = 1;
    private Integer size = 10;

    public long getOffset() {
        return (long) (Math.max(1, page) - 1) * Math.max(1, size);
    }
}