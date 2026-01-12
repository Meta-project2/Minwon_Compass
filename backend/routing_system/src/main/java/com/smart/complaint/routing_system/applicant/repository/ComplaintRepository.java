package com.smart.complaint.routing_system.applicant.repository;

import com.smart.complaint.routing_system.applicant.entity.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ComplaintRepository extends JpaRepository<Complaint, Long>, ComplaintRepositoryCustom {
    // 기본 CRUD(저장, 조회, 삭제)는 자동
    //queryFactory.selectFrom(complaint).where(complaint.district.name.eq("강남구"))

    //서비스 개발시
    //District district = districtRepository.getReferenceById(1);
    //complaint.setDistrict(district);

    @Query("select c from Complaint c join fetch c.district where c.incident.id = :incidentId order by c.receivedAt desc")
    List<Complaint> findAllByIncidentId(@Param("incidentId") Long incidentId);
}
