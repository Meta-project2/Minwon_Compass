package com.smart.complaint.routing_system.applicant.repository;

import com.smart.complaint.routing_system.applicant.entity.Complaint;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ComplaintRepository extends JpaRepository<Complaint, Long>, ComplaintRepositoryCustom {

    Optional<Complaint> findById(Long id);

    @Query("select c from Complaint c left join fetch c.district where c.incident.id = :incidentId order by c.receivedAt desc")
    List<Complaint> findAllByIncidentId(@Param("incidentId") Long incidentId);
}