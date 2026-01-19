package com.smart.complaint.routing_system.applicant.dto;

import java.time.LocalDateTime;

import com.smart.complaint.routing_system.applicant.domain.ComplaintStatus;
import com.smart.complaint.routing_system.applicant.entity.ChildComplaint;

public record ChildComplaintDto(
        Long id,
        String title,
        String body,
        String answer,
        ComplaintStatus status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {
    public static ChildComplaintDto from(ChildComplaint entity) {
        return new ChildComplaintDto(
                entity.getId(),
                entity.getTitle(),
                entity.getBody(),
                entity.getAnswer(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getUpdatedAt());
    }
}