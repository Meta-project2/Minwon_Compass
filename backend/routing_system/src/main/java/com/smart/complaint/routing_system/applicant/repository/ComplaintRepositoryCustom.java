package com.smart.complaint.routing_system.applicant.repository;

import com.smart.complaint.routing_system.applicant.dto.ComplaintDetailResponse;
import com.smart.complaint.routing_system.applicant.dto.ChildComplaintDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintHeatMap;
import com.smart.complaint.routing_system.applicant.dto.ComplaintListDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintResponse;
import com.smart.complaint.routing_system.applicant.dto.ComplaintSearchCondition;
import com.smart.complaint.routing_system.applicant.dto.ComplaintSearchResult;
import com.smart.complaint.routing_system.applicant.dto.AdminDashboardStatsDto.*;
import java.time.LocalDateTime;

import org.springframework.data.domain.Page;

import java.util.List;

public interface ComplaintRepositoryCustom {
    Page<ComplaintResponse> search(Long departmentId, ComplaintSearchCondition condition);

    List<ComplaintSearchResult> findSimilarComplaint(double[] queryEmbedding, int limit);

    public ComplaintDetailResponse getComplaintDetail(Long complaintId);

    List<ComplaintDto> findTop3RecentComplaintByApplicantId(Long id);

    List<ComplaintListDto> findAllByApplicantId(Long applicantId, String keyword);

    List<ComplaintHeatMap> getAllComplaintsWithLatLon();

    List<ComplaintHeatMap> getAllComplaintsWithLatLon(Long id);

    // 대시보드용 메서드
    // 1. 민원 접수 추이
    List<DailyCountDto> getDailyTrends(LocalDateTime start, LocalDateTime end, Long deptId);

    // 2. 처리 소요 시간
    List<TimeRangeDto> getProcessingTimeStats(LocalDateTime start, LocalDateTime end, Long deptId);

    // 3. 부서별 현황
    List<DeptStatusDto> getDeptStatusStats(LocalDateTime start, LocalDateTime end, Long deptId);

    // 4. AI 배정 정확도
    Double getAiAccuracy(LocalDateTime start, LocalDateTime end);

    // 5. 민원 유형 분포
    List<CategoryStatDto> getCategoryStats(LocalDateTime start, LocalDateTime end);

    // 6. 반복 민원 Top 3
    List<RecurringIncidentDto> getTopRecurringIncidents(LocalDateTime start, LocalDateTime end, LocalDateTime prevStart, LocalDateTime prevEnd);
    List<ChildComplaintDto> findChildComplaintsByParentId(Long id);
}