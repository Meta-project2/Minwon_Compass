package com.smart.complaint.routing_system.applicant.dto;

import com.smart.complaint.routing_system.applicant.entity.Complaint;
import com.smart.complaint.routing_system.applicant.entity.Incident;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ComplaintDetailResponse {
    private Long id;
    private String title;
    private String body;
    private String status;
    private String district;
    private String receivedAt;
    private String firstOccurred;
    private String lastOccurred;
    private Long complaintCount;
    private String avgProcessTime; // 평균 처리 시간
    private String neutralSummary;  // 요약문
    private List<String> keywords;   // 키워드 리스트
    private List<ComplaintResponse> complaints; // 사건 내 민원 리스트

    // Repository에서 사용하는 생성자 (image_b9c903 에러 해결)
    public ComplaintDetailResponse(Complaint complaint, Incident incident, Long count, String deptName) {
        this.id = complaint.getId();
        this.title = complaint.getTitle();
        this.body = complaint.getBody();
        this.status = complaint.getStatus().name();
        this.district = deptName;
        this.receivedAt = complaint.getReceivedAt() != null ? complaint.getReceivedAt().toString() : "-";

        if (incident != null) {
            this.firstOccurred = incident.getOpenedAt() != null ? incident.getOpenedAt().toString() : "-";
            this.lastOccurred = incident.getClosedAt() != null ? incident.getClosedAt().toString() : "-";
            this.complaintCount = count;
        } else {
            this.complaintCount = 0L;
        }
    }
}