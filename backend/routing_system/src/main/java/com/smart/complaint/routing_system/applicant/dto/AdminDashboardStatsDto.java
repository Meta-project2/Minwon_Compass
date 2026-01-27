package com.smart.complaint.routing_system.applicant.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

public class AdminDashboardStatsDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GeneralStatsResponse {
        private Double aiAccuracy;
        private List<CategoryStatDto> categoryStats;
        private List<RecurringIncidentDto> recurringIncidents;
    }

    @Data
    @AllArgsConstructor
    public static class DailyCountDto {
        private String date;
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
        private String range;
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