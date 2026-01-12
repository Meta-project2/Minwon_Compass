package com.smart.complaint.routing_system.applicant.repository;

import com.smart.complaint.routing_system.applicant.domain.IncidentStatus;
import com.smart.complaint.routing_system.applicant.dto.IncidentListResponse;
import java.util.List;

public interface IncidentRepositoryCustom {
    // 검색어(searchQuery)와 상태(status)로 검색
    List<IncidentListResponse> searchIncidents(String searchQuery, IncidentStatus status);
}