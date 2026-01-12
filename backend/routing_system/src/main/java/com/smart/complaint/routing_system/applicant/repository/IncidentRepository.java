package com.smart.complaint.routing_system.applicant.repository;

import com.smart.complaint.routing_system.applicant.entity.Incident;
import org.springframework.data.jpa.repository.JpaRepository;

// JpaRepository와 커스텀(QueryDSL)을 함께 상속
public interface IncidentRepository extends JpaRepository<Incident, Long>, IncidentRepositoryCustom {
}