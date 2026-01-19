package com.smart.complaint.routing_system.applicant.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor
public class ComplaintRerouteResponse {
    private Long rerouteId;
    private LocalDateTime requestedAt;

    // ★ String 타입으로 변경 (포맷팅된 번호 저장)
    private String complaintId;
    private String complaintTitle;
    private String address;

    private Long originDeptId;
    private String currentDeptName;

    private Long targetDeptId;
    private String targetDeptName;

    private String requesterName;
    private String requestReason;
    private String status;

    private Object aiRoutingRank;
    private String category;

    // QueryDSL용 생성자
    public ComplaintRerouteResponse(Long rerouteId, LocalDateTime requestedAt, Long originalComplaintId,
                                    LocalDateTime complaintReceivedAt,
                                    String complaintTitle, String address,
                                    Long originDeptId, String currentDeptName,
                                    Long targetDeptId, String targetDeptName,
                                    String requesterName, String requestReason,
                                    String status, Object aiRoutingRank, String targetObject) {
        this.rerouteId = rerouteId;
        this.requestedAt = requestedAt;

        // ★ 핵심: 서버 측 포맷팅 (C + 연도 + - + 4자리 ID)
        int year = (complaintReceivedAt != null) ? complaintReceivedAt.getYear() : LocalDateTime.now().getYear();
        this.complaintId = String.format("C%d-%04d", year, originalComplaintId);

        this.complaintTitle = complaintTitle;
        this.address = address;
        this.originDeptId = originDeptId;
        this.currentDeptName = currentDeptName;
        this.targetDeptId = targetDeptId;
        this.targetDeptName = targetDeptName;
        this.requesterName = requesterName;
        this.requestReason = requestReason;
        this.status = status;
        this.aiRoutingRank = aiRoutingRank;

        // ★ '민원' 대신 실제 분류값 사용
        this.category = (targetObject != null && !targetObject.isEmpty()) ? targetObject : "일반 민원";
    }
}