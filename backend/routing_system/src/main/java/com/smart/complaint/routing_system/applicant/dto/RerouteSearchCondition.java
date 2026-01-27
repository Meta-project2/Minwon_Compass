package com.smart.complaint.routing_system.applicant.dto;

import lombok.Data;

@Data
public class RerouteSearchCondition {
    private String status;
    private String keyword;

    private Long originDeptId;
    private Long targetDeptId;

    private Integer page = 1;
    private Integer size = 10;

    public long getOffset() {
        return (long) (Math.max(1, page) - 1) * size;
    }
}