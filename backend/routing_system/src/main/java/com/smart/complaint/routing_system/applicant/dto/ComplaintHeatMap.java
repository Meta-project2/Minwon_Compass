package com.smart.complaint.routing_system.applicant.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.smart.complaint.routing_system.applicant.domain.ComplaintStatus;
import com.smart.complaint.routing_system.applicant.entity.Complaint;

public record ComplaintHeatMap(
        Long id,
        String title,
        ComplaintStatus status,
        LocalDateTime createdAt,
        BigDecimal lat,
        BigDecimal lon) {
    public static ComplaintHeatMap from(Complaint entity) {
        if (entity.getLat() == null || entity.getLon() == null) {
            return null;
        }
        return new ComplaintHeatMap(
                entity.getId(),
                entity.getTitle(),
                entity.getStatus(),
                entity.getCreatedAt(),
                entity.getLat(),
                entity.getLon());
    }
}
