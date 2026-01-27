package com.smart.complaint.routing_system.applicant.dto;

import java.util.List;

public record ComplaintStatDto(
        double averageResponseTime,
        List<CategoryAvgDto> responseTimeData,
        String fastestCategory,
        double improvementRate) {
}
