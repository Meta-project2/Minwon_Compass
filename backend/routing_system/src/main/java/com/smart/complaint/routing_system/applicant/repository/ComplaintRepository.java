package com.smart.complaint.routing_system.applicant.repository;

import com.smart.complaint.routing_system.applicant.entity.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplaintRepository extends JpaRepository<Complaint, Long>, ComplaintRepositoryCustom {
    // 기본 CRUD(저장, 조회, 삭제)는 자동
    //queryFactory.selectFrom(complaint).where(complaint.district.name.eq("강남구"))

    //서비스 개발시
    //District district = districtRepository.getReferenceById(1);
    //complaint.setDistrict(district);

}
