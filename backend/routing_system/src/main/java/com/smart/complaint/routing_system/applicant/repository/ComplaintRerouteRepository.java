package com.smart.complaint.routing_system.applicant.repository;

import com.smart.complaint.routing_system.applicant.entity.ComplaintReroute;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplaintRerouteRepository
        extends JpaRepository<ComplaintReroute, Long>, ComplaintRerouteRepositoryCustom {
}