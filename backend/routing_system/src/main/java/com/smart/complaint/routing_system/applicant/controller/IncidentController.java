package com.smart.complaint.routing_system.applicant.controller;

import com.smart.complaint.routing_system.applicant.domain.IncidentStatus;
import com.smart.complaint.routing_system.applicant.dto.IncidentDetailResponse;
import com.smart.complaint.routing_system.applicant.dto.IncidentListResponse;
import com.smart.complaint.routing_system.applicant.entity.Complaint;
import com.smart.complaint.routing_system.applicant.entity.Incident;
import com.smart.complaint.routing_system.applicant.repository.ComplaintRepository;
import com.smart.complaint.routing_system.applicant.repository.IncidentRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Tag(name = "Incident API", description = "사건(군집) 관리 및 조회 API")
@RestController
@RequestMapping("/api/agent/incidents")
@RequiredArgsConstructor
public class IncidentController {

    private final IncidentRepository incidentRepository;
    private final ComplaintRepository complaintRepository;

    @Operation(summary = "사건 목록 조회", description = "검색어와 상태 필터를 사용하여 사건(군집) 목록을 조회합니다.<br>검색어는 '제목' 또는 '사건ID(숫자)'를 포함하며, 상태값이 없으면 전체를 조회합니다.")
    @GetMapping
    public List<IncidentListResponse> getIncidents(
            @Parameter(description = "검색어 (제목 또는 사건 ID 숫자 부분)", example = "도로 파손")
            @RequestParam(required = false) String search,

            @Parameter(description = "사건 상태 (OPEN, IN_PROGRESS, RESOLVED, CLOSED)")
            @RequestParam(required = false) IncidentStatus status
    ) {
        return incidentRepository.searchIncidents(search, status);
    }

    @Operation(summary = "사건 상세 조회", description = "사건 ID로 상세 정보와 구성 민원 목록을 조회합니다.<br>최근 발생일은 구성 민원 중 가장 최신 접수일을 기준으로 자동 계산됩니다.")
    @GetMapping("/{idStr}")
    public IncidentDetailResponse getIncidentDetail(
            @Parameter(description = "사건 ID 문자열 (예: I-2026-0001)", example = "I-2026-0001")
            @PathVariable String idStr
    ) {
        // 1. ID 파싱 (I-2026-0001 -> 1)
        Long id;
        try {
            String[] parts = idStr.split("-");
            id = Long.parseLong(parts[parts.length - 1]);
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "잘못된 사건 ID 형식입니다.");
        }

        // 2. 사건 조회
        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 사건을 찾을 수 없습니다."));

        // 3. 구성 민원 조회 (최신순)
        List<Complaint> complaints = complaintRepository.findAllByIncidentId(id);

        // 4. 날짜 포맷터
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

        // 5. 데이터 조립 (최근 발생일 계산)
        String lastOccurredStr = "-";
        if (!complaints.isEmpty()) {
            // 쿼리에서 이미 desc 정렬했으므로 0번째가 가장 최신
            lastOccurredStr = complaints.get(0).getReceivedAt().format(formatter);
        }

        // 민원 DTO 변환
        List<IncidentDetailResponse.IncidentComplaintDto> complaintDtos = complaints.stream()
                .map(c -> IncidentDetailResponse.IncidentComplaintDto.builder()
                        .originalId(c.getId())
                        .id(String.format("C2026-%04d", c.getId()))
                        .title(c.getTitle())
                        .receivedAt(c.getReceivedAt().format(formatter))
                        .urgency(c.getUrgency())
                        .status(c.getStatus())
                        .build())
                .collect(Collectors.toList());

        // 최종 반환
        return IncidentDetailResponse.builder()
                .id(idStr)
                .title(incident.getTitle())
                .status(incident.getStatus())
                // District가 Lazy 로딩이므로 null 체크 필요 (엔티티 그래프를 안 썼다면)
                .district(incident.getDistrictId() != null ? "강남구 (임시)" : "-") // District 객체 fetch 조인이 안되어있으면 ID만 사용
                .firstOccurred(incident.getOpenedAt() != null ? incident.getOpenedAt().format(formatter) : "-")
                .lastOccurred(lastOccurredStr)
                .complaintCount(complaints.size())
                .avgProcessTime("4.5시간") // 임시 데이터
                .complaints(complaintDtos)
                .build();
    }
}