package com.smart.complaint.routing_system.applicant.dto;

import com.smart.complaint.routing_system.applicant.domain.ComplaintStatus;
import com.smart.complaint.routing_system.applicant.domain.UrgencyLevel;
import lombok.Data;

@Data
public class ComplaintSearchCondition {
    // 필터 조건
    private String keyword;       // 검색어 (제목 + 내용)
    private ComplaintStatus status; // 처리 상태 (접수, 처리중 등)
    private UrgencyLevel urgency;   // 긴급도 (상, 중, 하)
    private Boolean hasIncident;    // 사건(군집) 연결 여부

    // 정렬 조건 (기본값: latest)
    // latest(최신순), urgency(긴급도순), status(상태순)
    private String sort = "latest";
}