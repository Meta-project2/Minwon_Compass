package com.smart.complaint.routing_system.applicant.controller;

import com.smart.complaint.routing_system.applicant.dto.AdminDashboardStatsDto.*;
import com.smart.complaint.routing_system.applicant.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService dashboardService;

    // 민원 접수 추이
    @GetMapping("/trend")
    public ResponseEntity<List<DailyCountDto>> getTrendStats(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate,
            @RequestParam(required = false) Long deptId // 국 ID (없으면 전체)
    ) {
        checkDates(startDate, endDate);
        return ResponseEntity.ok(dashboardService.getTrendStats(startDate, endDate, deptId));
    }

    // 처리 소요 시간
    @GetMapping("/processing-time")
    public ResponseEntity<List<TimeRangeDto>> getProcessingTimeStats(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate,
            @RequestParam(required = false) Long deptId // 국 ID
    ) {
        checkDates(startDate, endDate);
        return ResponseEntity.ok(dashboardService.getProcessingTimeStats(startDate, endDate, deptId));
    }

    // 부서별 현황
    @GetMapping("/dept-status")
    public ResponseEntity<List<DeptStatusDto>> getDeptStatusStats(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate,
            @RequestParam(required = false) Long deptId // 국 ID (없으면 국별 랭킹, 있으면 과별 랭킹)
    ) {
        checkDates(startDate, endDate);
        return ResponseEntity.ok(dashboardService.getDeptStatusStats(startDate, endDate, deptId));
    }

    // 일반 지표
    @GetMapping("/general")
    public ResponseEntity<GeneralStatsResponse> getGeneralStats(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate) {
        checkDates(startDate, endDate);
        return ResponseEntity.ok(dashboardService.getGeneralStats(startDate, endDate));
    }

    private void checkDates(LocalDate start, LocalDate end) {
        if (start == null || end == null) {
        }
    }

    @GetMapping("/departments")
    public ResponseEntity<List<DepartmentFilterDto>> getDepartmentFilters() {
        return ResponseEntity.ok(dashboardService.getBureauList());
    }
}