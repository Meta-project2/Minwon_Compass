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

    // 헤더 정보
    private String id;              // I-2026-xxxx
    private String title;           // 사건 제목
    private IncidentStatus status;  // 사건 상태
    private String district;        // 행정동 (예: 역삼동)

    private String firstOccurred;   // 최초 발생일 (사건 생성일)
    private String lastOccurred;    // 최근 발생일 (가장 최근 민원 접수일)
    private int complaintCount;     // 구성 민원 수
    private String avgProcessTime;  // 평균 처리 시간 (목업 유지)

    // 구성 민원 리스트
    private List<IncidentComplaintDto> complaints;

    @Data
    @Builder
    public static class IncidentComplaintDto {
        private String id;          // C2026-xxxx
        private Long originalId;    // DB PK (상세 이동용)
        private String title;
        private String receivedAt;
        private UrgencyLevel urgency;
        private ComplaintStatus status;
    }
}