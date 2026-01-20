package com.smart.complaint.routing_system.applicant.controller;

import com.smart.complaint.routing_system.applicant.domain.IncidentStatus;
import com.smart.complaint.routing_system.applicant.dto.IncidentDetailResponse;
import com.smart.complaint.routing_system.applicant.dto.IncidentListResponse;
import com.smart.complaint.routing_system.applicant.entity.Complaint;
import com.smart.complaint.routing_system.applicant.entity.Incident;
import com.smart.complaint.routing_system.applicant.repository.ComplaintRepository;
import com.smart.complaint.routing_system.applicant.repository.IncidentRepository;
import com.smart.complaint.routing_system.applicant.service.IncidentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Tag(name = "사건 API", description = "사건(군집) 관리 및 조회 API")
@RestController
@RequestMapping("/api/agent/incidents")
@RequiredArgsConstructor
public class IncidentController {

    private final IncidentRepository incidentRepository;
    private final ComplaintRepository complaintRepository;
    private final IncidentService incidentService;

    @Operation(summary = "사건 목록 조회")
    @GetMapping
    public Page<IncidentListResponse> getIncidents(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) IncidentStatus status,
            @PageableDefault(size = 10) Pageable pageable) {

        // 검색/필터가 적용된 QueryDSL 메서드를 호출합니다.
        return incidentRepository.searchIncidents(search, status, pageable);
    }

    @Operation(summary = "사건 상세 조회")
    @GetMapping("/{idStr}")
    public IncidentDetailResponse getIncidentDetail(@PathVariable String idStr) {
        Long id;
        try {
            // "I-2026-1234" 형태에서 숫자만 추출
            String[] parts = idStr.split("-");
            id = Long.parseLong(parts[parts.length - 1]);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ID 형식이 잘못되었습니다.");
        }

        // 1. 사건(Incident) 정보 조회
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사건 없음"));

        // 2. 해당 사건에 속한 모든 민원(Complaints) 조회
        List<Complaint> complaints = complaintRepository.findAllByIncidentId(id);
        if (complaints == null) complaints = new ArrayList<>();

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

        // [수정] 최초 발생일 계산 (민원 중 가장 빠른 접수일)
        String firstOccurredStr = "-";
        LocalDateTime minDate = complaints.stream()
                .map(Complaint::getReceivedAt)
                .filter(java.util.Objects::nonNull)
                .min(Comparator.naturalOrder())
                .orElse(null);
        if (minDate != null) firstOccurredStr = minDate.format(formatter);

        // [수정] 최근 발생일 계산 (민원 중 가장 늦은 접수일)
        String lastOccurredStr = "-";
        LocalDateTime maxDate = complaints.stream()
                .map(Complaint::getReceivedAt)
                .filter(java.util.Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);
        if (maxDate != null) lastOccurredStr = maxDate.format(formatter);

        // 3. 민원 리스트 DTO 변환
        List<IncidentDetailResponse.IncidentComplaintDto> complaintDtos = complaints.stream()
                .map(c -> IncidentDetailResponse.IncidentComplaintDto.builder()
                        .originalId(c.getId())
                        .id(String.format("C2026-%04d", c.getId()))
                        .title(c.getTitle())
                        .receivedAt(c.getReceivedAt() != null ? c.getReceivedAt().format(formatter) : "-")
                        .status(c.getStatus())
                        .build())
                .collect(Collectors.toList());

        // 4. 응답 생성 (계산된 값 주입)
        return IncidentDetailResponse.builder()
                .id(idStr)
                .title(incident.getTitle())
                .status(incident.getStatus())
                .district("-") // 구 정보가 필요하면 incident.getDistrictId() 등으로 조회 필요
                .firstOccurred(firstOccurredStr) // [수정됨] 계산된 최초 발생일
                .lastOccurred(lastOccurredStr)   // [수정됨] 계산된 최근 발생일
                .complaintCount(complaints.size()) // 실제 리스트 개수로 갱신
                .avgProcessTime(calculateAverageProcessTime(complaints)) // 평균 처리시간 계산
                .complaints(complaintDtos)
                .build();
    }

    // [API 1] 제목 수정 기능 (수정됨)
    @PatchMapping("/{idStr}") // [수정] id 대신 idStr로 받아 글자 처리 가능하게 변경
    public void updateIncidentTitle(@PathVariable String idStr, @RequestBody java.util.Map<String, String> body) {
        Long id = parseId(idStr); // 글자를 숫자로 변환
        String newTitle = body.get("title");
        incidentService.updateTitle(id, newTitle);
    }

    // [API 2] 민원 이동 (POST)
    // 프론트에서 { "targetIncidentId": 100, "complaintIds": [1, 2, 3] } 형태로 보냄
    @PostMapping("/move")
    public void moveComplaintsToIncident(@RequestBody com.smart.complaint.routing_system.applicant.dto.IncidentMoveRequestDto request) {
        incidentService.moveComplaints(request.getTargetIncidentId(), request.getComplaintIds());
    }

    // [API 3] 새 사건방 만들기 (POST)
    @PostMapping("/new")
    public void createNewIncident(@RequestBody com.smart.complaint.routing_system.applicant.dto.IncidentMoveRequestDto request) {
        // targetIncidentId는 필요 없지만 DTO 재활용 (complaintIds만 사용)
        incidentService.createNewIncident(request.getComplaintIds());
    }

    // 평균 처리시간 계산 메서드 (접수일 ~ 종결일)
    private String calculateAverageProcessTime(List<Complaint> complaints) {
        if (complaints == null || complaints.isEmpty()) return "0분";

        long totalMinutes = 0;
        int count = 0;

        for (Complaint c : complaints) {
            // 접수일(receivedAt)과 종결일(closedAt)이 모두 있을 때만 계산
            if (c.getReceivedAt() != null && c.getClosedAt() != null) {
                java.time.Duration duration = java.time.Duration.between(c.getReceivedAt(), c.getClosedAt());
                totalMinutes += duration.toMinutes();
                count++;
            }
        }

        if (count == 0) return "-"; // 처리 완료된 건이 없을 경우

        long avgMinutes = totalMinutes / count;

        // 단위 변환 로직 (분 -> 일, 시간)
        long days = avgMinutes / (24 * 60);
        long remainingMinutesAfterDays = avgMinutes % (24 * 60);
        long hours = remainingMinutesAfterDays / 60;
        // 남은 분(minutes)까지 표시하고 싶다면 아래 주석 해제
        // long minutes = remainingMinutesAfterDays % 60;

        StringBuilder sb = new StringBuilder();

        if (days > 0) {
            sb.append(days).append("일 ");
        }
        if (hours > 0) {
            sb.append(hours).append("시간");
        }
        if (days == 0 && hours == 0) {
            return "1시간 미만";
        }

        return sb.toString().trim();
    }

    private Long parseId(String idStr) {
        try {
            String[] parts = idStr.split("-");
            return Long.parseLong(parts[parts.length - 1]);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ID 형식이 잘못되었습니다.");
        }
    }
}