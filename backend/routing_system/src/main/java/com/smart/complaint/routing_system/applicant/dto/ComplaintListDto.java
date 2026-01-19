package com.smart.complaint.routing_system.applicant.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.smart.complaint.routing_system.applicant.domain.ComplaintStatus;
import com.smart.complaint.routing_system.applicant.entity.Complaint;

public record ComplaintListDto(
        Long id,
        String title,
        String body,
        String answer,
        String addressText,
        ComplaintStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
    public static ComplaintListDto from(Complaint entity, List<ChildComplaintDto> complaintDtos) {
        return new ComplaintListDto(
                entity.getId(),
                entity.getTitle(),
                entity.getBody(),
                entity.getAnswer(),
                entity.getAddressText(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }
}
