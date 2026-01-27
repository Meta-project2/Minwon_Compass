package com.smart.complaint.routing_system.applicant.service;

import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.smart.complaint.routing_system.applicant.dto.AdminDashboardStatsDto;
import com.smart.complaint.routing_system.applicant.entity.QDepartment;
import com.smart.complaint.routing_system.applicant.repository.ComplaintRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminDashboardService {

    private final ComplaintRepository complaintRepository;
    private final JPAQueryFactory queryFactory;

    public List<AdminDashboardStatsDto.DailyCountDto> getTrendStats(LocalDate startDate, LocalDate endDate,
            Long deptId) {
        return complaintRepository.getDailyTrends(atStart(startDate), atEnd(endDate), deptId);
    }

    public List<AdminDashboardStatsDto.TimeRangeDto> getProcessingTimeStats(LocalDate startDate, LocalDate endDate,
            Long deptId) {
        return complaintRepository.getProcessingTimeStats(atStart(startDate), atEnd(endDate), deptId);
    }

    public List<AdminDashboardStatsDto.DeptStatusDto> getDeptStatusStats(LocalDate startDate, LocalDate endDate,
            Long deptId) {
        return complaintRepository.getDeptStatusStats(atStart(startDate), atEnd(endDate), deptId);
    }

    public AdminDashboardStatsDto.GeneralStatsResponse getGeneralStats(LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = atStart(startDate);
        LocalDateTime end = atEnd(endDate);
        long days = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        LocalDateTime prevStart = start.minusDays(days);
        LocalDateTime prevEnd = start.minusNanos(1);

        return AdminDashboardStatsDto.GeneralStatsResponse.builder()
                .aiAccuracy(complaintRepository.getAiAccuracy(start, end))
                .categoryStats(complaintRepository.getCategoryStats(start, end))
                .recurringIncidents(complaintRepository.getTopRecurringIncidents(start, end, prevStart, prevEnd))
                .build();
    }

    private LocalDateTime atStart(LocalDate date) {
        return (date != null ? date : LocalDate.now().minusDays(6)).atStartOfDay();
    }

    private LocalDateTime atEnd(LocalDate date) {
        return (date != null ? date : LocalDate.now()).atTime(LocalTime.MAX);
    }

    public List<AdminDashboardStatsDto.DepartmentFilterDto> getBureauList() {
        QDepartment dept = QDepartment.department;
        return queryFactory
                .select(Projections.constructor(AdminDashboardStatsDto.DepartmentFilterDto.class,
                        dept.id,
                        dept.name))
                .from(dept)
                .where(dept.category.eq("GUK")
                        .and(dept.isActive.isTrue()))
                .orderBy(dept.id.asc())
                .fetch();
    }
}