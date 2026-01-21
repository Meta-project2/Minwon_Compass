package com.smart.complaint.routing_system.applicant.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.smart.complaint.routing_system.applicant.domain.ComplaintStatus;
import com.smart.complaint.routing_system.applicant.entity.Complaint;

public record ComplaintDetailDto(
        Long id,
        String title,
        String body,
        String answer,
        String addressText,
        ComplaintStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String departmentName,
        List<ChildComplaintDto> children // 자식 리스트
) {
    public static ComplaintDetailDto withChildren(ComplaintDetailDto dto, List<ChildComplaintDto> children) {
        return new ComplaintDetailDto(
                dto.id(), dto.title(), dto.body(), dto.answer(),
                dto.addressText(), dto.status(), dto.createdAt(),
                dto.updatedAt(), dto.departmentName(), children);
    }
}
