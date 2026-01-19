package com.smart.complaint.routing_system.applicant.repository;

import com.smart.complaint.routing_system.applicant.entity.ComplaintReroute;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplaintRerouteRepository extends JpaRepository<ComplaintReroute, Long>, ComplaintRerouteRepositoryCustom {
    // 특정 민원의 재이관 이력 조회 메서드 추가?
    // List<ComplaintReroute> findByComplaintId(Long complaintId);
}