package com.smart.complaint.routing_system.applicant.controller;

import com.smart.complaint.routing_system.applicant.domain.IncidentStatus;
import com.smart.complaint.routing_system.applicant.dto.IncidentDetailResponse;
import com.smart.complaint.routing_system.applicant.dto.IncidentListResponse;
import com.smart.complaint.routing_system.applicant.entity.Complaint;
import com.smart.complaint.routing_system.applicant.entity.Incident;
import com.smart.complaint.routing_system.applicant.repository.ComplaintRepository;
import com.smart.complaint.routing_system.applicant.repository.IncidentRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Tag(name = "사건 API", description = "사건(군집) 관리 및 조회 API")
@RestController
@RequestMapping("/api/agent/incidents")
@RequiredArgsConstructor
public class IncidentController {

    private final IncidentRepository incidentRepository;
    private final ComplaintRepository complaintRepository;

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
            String[] parts = idStr.split("-");
            id = Long.parseLong(parts[parts.length - 1]);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ID 형식이 잘못되었습니다.");
        }

        Incident incident = incidentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사건 없음"));

        List<Complaint> complaints = complaintRepository.findAllByIncidentId(id);
        if (complaints == null) complaints = new ArrayList<>();

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

        // [핵심 해결] 리스트를 변환하여 complaintDtos 변수에 담아줍니다.
        List<IncidentDetailResponse.IncidentComplaintDto> complaintDtos = complaints.stream()
                .map(c -> IncidentDetailResponse.IncidentComplaintDto.builder()
                        .originalId(c.getId())
                        .id(String.format("C2026-%04d", c.getId()))
                        .title(c.getTitle())
                        .receivedAt(c.getCreatedAt() != null ? c.getCreatedAt().format(formatter) : "-")
                        .urgency(c.getUrgency())
                        .status(c.getStatus())
                        .build())
                .collect(Collectors.toList());

        return IncidentDetailResponse.builder()
                .id(idStr)
                .title(incident.getTitle())
                .status(incident.getStatus())
                .district("-")
                .firstOccurred(incident.getOpenedAt() != null ? incident.getOpenedAt().format(formatter) : "-")
                .lastOccurred(incident.getClosedAt() != null ? incident.getClosedAt().format(formatter) : "-")
                .complaintCount(incident.getComplaintCount() != null ? incident.getComplaintCount() : complaints.size())
                .avgProcessTime("4.5시간")
                .complaints(complaintDtos) // 이제 에러 없이 정상 참조됩니다.
                .build();
    }
}