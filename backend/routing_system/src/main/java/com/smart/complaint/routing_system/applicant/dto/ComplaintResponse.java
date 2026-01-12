package com.smart.complaint.routing_system.applicant.dto;

import com.smart.complaint.routing_system.applicant.domain.ComplaintStatus;
import com.smart.complaint.routing_system.applicant.domain.UrgencyLevel;
import com.smart.complaint.routing_system.applicant.entity.Complaint;
import lombok.Data;
import java.time.format.DateTimeFormatter;

@Data
public class ComplaintResponse {
    private String id;          // 화면용 ID (예: C2026-0001)
    private Long originalId;    // 실제 DB ID (상세 조회용)
    private String title;
    private String address;
    private String receivedAt;  // 문자열로 변환된 날짜
    private ComplaintStatus status;
    private UrgencyLevel urgency;
    private String incidentId;  // 사건 ID (있으면 I-2026-001)

    private String neutralSummary; // 민원 내용 요약(LLM)

    // Entity -> DTO 변환 생성자
    public ComplaintResponse(Complaint complaint) {
        this.originalId = complaint.getId();

        // ID 변환 로직: "C" + 연도 + 4자리 숫자
        // receivedAt의 연도?? 일단 간단히 구현
        this.id = String.format("C2026-%04d", complaint.getId());

        this.title = complaint.getTitle();
        this.address = complaint.getAddressText();
        this.receivedAt = complaint.getReceivedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
        this.status = complaint.getStatus();
        this.urgency = complaint.getUrgency();

        if (complaint.getIncident() != null) {
            this.incidentId = String.format("I-2026-%04d", complaint.getIncident().getId());
        }
    }
}