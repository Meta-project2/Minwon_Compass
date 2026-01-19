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

    // 1. 접수 추이
    public List<AdminDashboardStatsDto.DailyCountDto> getTrendStats(LocalDate startDate, LocalDate endDate, Long deptId) {
        return complaintRepository.getDailyTrends(atStart(startDate), atEnd(endDate), deptId);
    }

    // 2. 처리 시간
    public List<AdminDashboardStatsDto.TimeRangeDto> getProcessingTimeStats(LocalDate startDate, LocalDate endDate, Long deptId) {
        return complaintRepository.getProcessingTimeStats(atStart(startDate), atEnd(endDate), deptId);
    }

    // 3. 부서 현황
    public List<AdminDashboardStatsDto.DeptStatusDto> getDeptStatusStats(LocalDate startDate, LocalDate endDate, Long deptId) {
        return complaintRepository.getDeptStatusStats(atStart(startDate), atEnd(endDate), deptId);
    }

    // 4. 일반 지표
    public AdminDashboardStatsDto.GeneralStatsResponse getGeneralStats(LocalDate startDate, LocalDate endDate) {
        LocalDateTime start = atStart(startDate);
        LocalDateTime end = atEnd(endDate);

        // 반복 민원용 이전 기간 계산
        long days = ChronoUnit.DAYS.between(startDate, endDate) + 1;
        LocalDateTime prevStart = start.minusDays(days);
        LocalDateTime prevEnd = start.minusNanos(1);

        return AdminDashboardStatsDto.GeneralStatsResponse.builder()
                .aiAccuracy(complaintRepository.getAiAccuracy(start, end))
                .categoryStats(complaintRepository.getCategoryStats(start, end))
                .recurringIncidents(complaintRepository.getTopRecurringIncidents(start, end, prevStart, prevEnd))
                .build();
    }

    // Helper Methods
    private LocalDateTime atStart(LocalDate date) {
        return (date != null ? date : LocalDate.now().minusDays(6)).atStartOfDay();
    }
    private LocalDateTime atEnd(LocalDate date) {
        return (date != null ? date : LocalDate.now()).atTime(LocalTime.MAX);
    }

    // 국(GUK) 단위 부서 목록 조회
    public List<AdminDashboardStatsDto.DepartmentFilterDto> getBureauList() {
        QDepartment dept = QDepartment.department;
        return queryFactory // JPAQueryFactory 주입 필요 (없으면 생성자 주입 추가)
                .select(Projections.constructor(AdminDashboardStatsDto.DepartmentFilterDto.class,
                        dept.id,
                        dept.name))
                .from(dept)
                .where(dept.category.eq("GUK") // '국'만 필터링
                        .and(dept.isActive.isTrue()))
                .orderBy(dept.id.asc())
                .fetch();
    }
}