package com.smart.complaint.routing_system.applicant.dto;

import lombok.Data;

@Data
public class RerouteSearchCondition {
    private String status;       // PENDING, APPROVED, REJECTED
    private String keyword;      // 제목, 요청자명, 민원번호

    private Long originDeptId;   //  현재 부서 필터
    private Long targetDeptId;   //  희망 부서 필터

    private Integer page = 1;
    private Integer size = 10;

    public long getOffset() {
        return (long) (Math.max(1, page) - 1) * size;
    }
}