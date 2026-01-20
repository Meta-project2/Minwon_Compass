package com.smart.complaint.routing_system.applicant.dto;

import lombok.Data;
import java.util.List;

@Data
public class IncidentMoveRequestDto {
    private Long targetIncidentId; // 이동할 목표 사건 ID
    private List<Long> complaintIds; // 이동시킬 민원 ID 목록
}

// 제목수정용 Dto