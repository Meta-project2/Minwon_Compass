package com.smart.complaint.routing_system.applicant.controller;

import com.smart.complaint.routing_system.applicant.dto.AdminDashboardStatsDto;
import com.smart.complaint.routing_system.applicant.dto.RerouteSearchCondition;
import com.smart.complaint.routing_system.applicant.dto.ComplaintRerouteResponse;
import com.smart.complaint.routing_system.applicant.entity.User;
import com.smart.complaint.routing_system.applicant.repository.ComplaintRerouteRepository;
import com.smart.complaint.routing_system.applicant.service.AdminDashboardService;
import com.smart.complaint.routing_system.applicant.service.ComplaintService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Tag(name = "관리자 API", description = "민원 재이관 승인/반려 등 관리자 전용 기능")
@RestController
@RequestMapping("/api/admin/complaints")
@RequiredArgsConstructor
public class AdminController {

    private final ComplaintService complaintService;
    private final ComplaintRerouteRepository complaintRerouteRepository;
    private final AdminDashboardService dashboardService;

    @Operation(summary = "재이관 승인", description = "요청된 재이관 건을 승인하여 부서를 이동시킵니다.")
    @PostMapping("/reroutes/{rerouteId}/approve")
    public ResponseEntity<String> approveReroute(
            @PathVariable Long rerouteId,
            HttpServletRequest request) {

        User adminUser = getSessionUser(request); // 관리자 권한 체크 로직 필요 시 추가
        complaintService.approveReroute(rerouteId, adminUser.getId());

        return ResponseEntity.ok("재이관 요청이 승인되었습니다. 해당 부서로 민원이 이동했습니다.");
    }

    @Operation(summary = "재이관 반려", description = "요청된 재이관 건을 반려하여 원래 부서로 되돌립니다.")
    @PostMapping("/reroutes/{rerouteId}/reject")
    public ResponseEntity<String> rejectReroute(
            @PathVariable Long rerouteId,
            HttpServletRequest request) {

        User adminUser = getSessionUser(request);
        complaintService.rejectReroute(rerouteId, adminUser.getId());

        return ResponseEntity.ok("재이관 요청이 반려되었습니다. 민원이 다시 접수 상태로 변경됩니다.");
    }

    // 기존 AdminController에 추가
    @GetMapping("/reroutes")
    public ResponseEntity<Page<ComplaintRerouteResponse>> getReroutes(
            @ModelAttribute RerouteSearchCondition condition) {
        // Repository 직접 호출 (단순 조회)
        Page<ComplaintRerouteResponse> result = complaintRerouteRepository.searchReroutes(condition);
        return ResponseEntity.ok(result);
    }

    // 세션 사용자 조회 (기존 Controller와 동일 로직)
    private User getSessionUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("LOGIN_USER") == null) {
            // 테스트용 임시 예외 처리
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "관리자 로그인이 필요합니다.");
        }
        return (User) session.getAttribute("LOGIN_USER");
    }

    // [추가] 필터용 부서 목록 조회 (국 단위)
    @GetMapping("/departments")
    public ResponseEntity<List<AdminDashboardStatsDto.DepartmentFilterDto>> getDepartmentFilters() {
        return ResponseEntity.ok(dashboardService.getBureauList());
    }
}