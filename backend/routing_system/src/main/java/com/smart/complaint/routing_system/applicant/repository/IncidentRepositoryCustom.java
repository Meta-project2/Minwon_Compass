package com.smart.complaint.routing_system.applicant.repository;

import com.smart.complaint.routing_system.applicant.domain.IncidentStatus;
import com.smart.complaint.routing_system.applicant.dto.IncidentListResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface IncidentRepositoryCustom {
    Page<IncidentListResponse> searchIncidents(String searchQuery, IncidentStatus status, Pageable pageable);
}