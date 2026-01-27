package com.smart.complaint.routing_system.applicant.controller;

import com.smart.complaint.routing_system.applicant.dto.*;
import com.smart.complaint.routing_system.applicant.entity.User;
import com.smart.complaint.routing_system.applicant.repository.ComplaintRepository;
import com.smart.complaint.routing_system.applicant.service.ComplaintService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import jakarta.servlet.http.HttpSession;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Tag(name = "민원 API", description = "민원 관리 및 조회 API")
@RestController
@RequestMapping("/api/agent/complaints")
@RequiredArgsConstructor
public class ComplaintController {

    private final ComplaintRepository complaintRepository;
    private final ComplaintService complaintService;

    @Operation(summary = "민원 리스트 조회", description = "로그인한 사용자의 부서에 배정된 민원 리스트를 전부 조회합니다.")
    @GetMapping
    public Page<ComplaintResponse> getComplaints(
            @ModelAttribute ComplaintSearchCondition condition, HttpServletRequest request) {
        Long myDepartmentId = 11L;
        User user = getSessionUser(request);
        myDepartmentId = user.getDepartment().getId();

        return complaintRepository.search(myDepartmentId, condition);
    }

    @Operation(summary = "민원 상세 조회", description = "민원 ID로 상세 정보(원문, 요약, 분석결과, 사건연결정보 등)를 조회합니다.")
    @GetMapping("/{id}")
    public ComplaintDetailResponse getComplaintDetail(@PathVariable Long id) {
        return complaintRepository.getComplaintDetail(id);
    }

    @Operation(summary = "담당자 배정 (Assign)", description = "해당 민원을 내 업무로 가져옵니다. (상태가 '처리중'으로 변경됨)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "배정 성공"),
            @ApiResponse(responseCode = "404", description = "민원을 찾을 수 없음"),
            @ApiResponse(responseCode = "401", description = "로그인 필요")
    })
    @PostMapping("/{id}/assign")
    public ResponseEntity<String> assignManager(
            @Parameter(description = "민원 ID", example = "1") @PathVariable Long id,
            HttpServletRequest request) {
        User user = getSessionUser(request);
        complaintService.assignManager(id, user.getId());
        return ResponseEntity.ok("성공적으로 담당자가 배정되었습니다.");
    }

    @Operation(summary = "답변 등록 및 처리", description = "답변을 임시 저장하거나, 최종 전송하여 민원을 종결합니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "처리 성공"),
            @ApiResponse(responseCode = "404", description = "민원을 찾을 수 없음")
    })
    @PostMapping("/{id}/answer")
    public ResponseEntity<String> saveAnswer(
            @Parameter(description = "민원 ID", example = "1") @PathVariable Long id,
            @RequestBody ComplaintAnswerRequest dto) {
        complaintService.saveAnswer(id, dto);
        String message = dto.isTemporary() ? "답변이 임시 저장되었습니다." : "답변 전송 및 민원 처리가 완료되었습니다.";
        return ResponseEntity.ok(message);
    }

    @Operation(summary = "이관 요청 (Reroute)", description = "타 부서 소관인 경우 이관을 요청합니다. (관리자 승인 대기 상태가 됨)")
    @PostMapping("/{id}/reroute")
    public ResponseEntity<String> requestReroute(
            @Parameter(description = "민원 ID", example = "1") @PathVariable Long id,
            @RequestBody ComplaintRerouteRequest dto,
            HttpServletRequest request) {
        User user = getSessionUser(request);
        complaintService.requestReroute(id, dto, user.getId());
        return ResponseEntity.ok("이관 요청이 접수되었습니다. 관리자 승인 후 반영됩니다.");
    }

    @Operation(summary = "담당 취소 (Release)", description = "배정받은 민원을 포기하고 다시 접수 상태로 되돌립니다.")
    @PostMapping("/{id}/release")
    public ResponseEntity<String> releaseManager(
            @Parameter(description = "민원 ID") @PathVariable Long id,
            HttpServletRequest request) {
        User user = getSessionUser(request);
        complaintService.releaseManager(id, user.getId());
        return ResponseEntity.ok("담당 배정이 취소되었습니다.");
    }

    private User getSessionUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("LOGIN_USER") == null) {

            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return (User) session.getAttribute("LOGIN_USER");
    }

}