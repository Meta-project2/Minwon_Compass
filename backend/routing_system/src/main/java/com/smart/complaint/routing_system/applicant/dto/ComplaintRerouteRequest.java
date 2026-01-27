package com.smart.complaint.routing_system.applicant.dto;

import lombok.Data;

@Data
public class ComplaintRerouteRequest {
    private Long targetDeptId;
    private String reason;
}