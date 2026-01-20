package com.smart.complaint.routing_system.applicant.dto;

import java.util.List;

public record ComplaintStatDto(
    double averageResponseTime,         // 전체 평균 (예: 4.4)
    List<CategoryAvgDto> responseTimeData, // 부서별 평균 (Top 5)
    String fastestCategory,             // 최단 처리 부서 이름
    double improvementRate
) {
}
