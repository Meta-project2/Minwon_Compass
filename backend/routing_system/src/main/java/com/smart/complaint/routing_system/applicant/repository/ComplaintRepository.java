package com.smart.complaint.routing_system.applicant.repository;

import com.smart.complaint.routing_system.applicant.entity.Complaint;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ComplaintRepository extends JpaRepository<Complaint, Long>, ComplaintRepositoryCustom {

    Optional<Complaint> findById(Long id);

    // 기본 CRUD(저장, 조회, 삭제)는 자동
    //queryFactory.selectFrom(complaint).where(complaint.district.name.eq("강남구"))

    /**
     * 특정 사건(Incident)에 포함된 모든 민원 목록을 조회합니다.
     * 행정동(District) 정보가 없어도 조회되도록 left join fetch를 사용합니다.
     */
    @Query("select c from Complaint c left join fetch c.district where c.incident.id = :incidentId order by c.receivedAt desc")
    List<Complaint> findAllByIncidentId(@Param("incidentId") Long incidentId);
}