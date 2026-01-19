package com.smart.complaint.routing_system.applicant.repository;

import com.smart.complaint.routing_system.applicant.dto.ComplaintRerouteResponse;
import com.smart.complaint.routing_system.applicant.dto.RerouteSearchCondition;
import org.springframework.data.domain.Page;

public interface ComplaintRerouteRepositoryCustom {
    Page<ComplaintRerouteResponse> searchReroutes(RerouteSearchCondition condition);
}