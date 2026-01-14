package com.smart.complaint.routing_system.applicant.repository;

import java.util.List;
import com.smart.complaint.routing_system.applicant.entity.Incident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

// [중요] JpaRepository와 IncidentRepositoryCustom을 모두 상속받아야 합니다.
public interface IncidentRepository extends JpaRepository<Incident, Long>, IncidentRepositoryCustom {

    @Query("SELECT i FROM Incident i WHERE i.status = 'OPEN' AND i.complaintCount >= 5 ORDER BY i.closedAt DESC")
    List<Incident> findMajorIncidents();
}