package com.smart.complaint.routing_system.applicant.repository;

import com.smart.complaint.routing_system.applicant.domain.IncidentStatus;
import com.smart.complaint.routing_system.applicant.dto.IncidentListResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface IncidentRepositoryCustom {
    // [핵심] 파라미터 3개: 검색어, 상태, 페이징(Pageable)
    Page<IncidentListResponse> searchIncidents(String searchQuery, IncidentStatus status, Pageable pageable);
}