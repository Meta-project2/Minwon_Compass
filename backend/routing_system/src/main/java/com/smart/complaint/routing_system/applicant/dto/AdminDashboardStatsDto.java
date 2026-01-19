package com.smart.complaint.routing_system.applicant.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

// [수정] 메인 클래스의 어노테이션(@Data, @Builder 등) 제거 -> 생성자 충돌 해결
public class AdminDashboardStatsDto {

    // --- [1] 공통 위젯용 DTO (API 반환용) ---
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GeneralStatsResponse {
        private Double aiAccuracy;
        private List<CategoryStatDto> categoryStats;
        private List<RecurringIncidentDto> recurringIncidents;
    }

    // --- Inner DTOs (데이터 담는 그릇) ---

    @Data
    @AllArgsConstructor
    public static class DailyCountDto {
        private String date; // "MM/DD"
        private Long count;
    }

    @Data
    @AllArgsConstructor
    public static class CategoryStatDto {
        private String categoryName;
        private Long count;
    }

    @Data
    @AllArgsConstructor
    public static class DeptStatusDto {
        private String deptName;
        private Long received;
        private Long pending;
    }

    @Data
    @AllArgsConstructor
    public static class TimeRangeDto {
        private String range; // "3일 이내", "7일 이내"...
        private Long count;
    }

    @Data
    @AllArgsConstructor
    public static class RecurringIncidentDto {
        private String incidentId;
        private String title;
        private Long count;
        private Long trend;
    }

    @Data
    @AllArgsConstructor
    public static class DepartmentFilterDto {
        private Long id;
        private String name;
    }
}