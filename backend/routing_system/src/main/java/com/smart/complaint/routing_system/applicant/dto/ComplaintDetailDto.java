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
        List<ChildComplaintDto> children // 자식 리스트
) {
    public static ComplaintDetailDto from(Complaint entity, List<ChildComplaintDto> complaintDtos) {
        return new ComplaintDetailDto(
                entity.getId(),
                entity.getTitle(),
                entity.getBody(),
                entity.getAnswer(),
                entity.getAddressText(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                complaintDtos != null ? complaintDtos : List.of()); // 빈 리스트 또는 정렬된 리스트 전달
    }
}
