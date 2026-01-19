package com.smart.complaint.routing_system.applicant.service;

import com.smart.complaint.routing_system.applicant.entity.Incident;
import com.smart.complaint.routing_system.applicant.repository.IncidentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final ComplaintRepository complaintRepository;

    // ... 기존 getMajorIncidents 코드 유지 ...

    /**
     * [기능 1] 사건 제목 수정
     */
    public Page<Incident> getMajorIncidents(Pageable pageable) {
        // 1. 아까 Repository에 만든 '5개 이상만 가져와!' 명령을 시킵니다.
        List<Incident> majorList = incidentRepository.findMajorIncidents();

        // 2. 가져온 리스트를 화면에서 쓸 수 있게 페이지(Page) 형태로 변환합니다.
        // (데이터가 많지 않으므로 자바에서 직접 자릅니다)
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), majorList.size());

        if (start > majorList.size()) {
            return new PageImpl<>(List.of(), pageable, majorList.size());
        }

        List<Incident> subList = majorList.subList(start, end);
        return new PageImpl<>(subList, pageable, majorList.size());
    }
<<<<<<< HEAD

    /*
     * // [추가] 제목 변경 로직
     *
     * @Transactional
     * public void updateTitle(Long incidentId, String newTitle) {
     * Incident incident = incidentRepository.findById(incidentId)
     * .orElseThrow(() -> new IllegalArgumentException("사건을 찾을 수 없습니다."));
     * incident.setTitle(newTitle); // Entity에 setTitle 메서드가 있어야 합니다.
     * }
     *
     * // [추가] 민원 이동 및 숫자 조정 로직 (핵심)
     *
     * @Transactional
     * public void moveComplaints(Long targetIncidentId, List<Long> complaintIds) {
     * Incident targetIncident = incidentRepository.findById(targetIncidentId)
     * .orElseThrow(() -> new IllegalArgumentException("이동할 대상 사건이 없습니다."));
     *
     * List<Complaint> complaints = complaintRepository.findAllById(complaintIds);
     *
     * for (Complaint c : complaints) {
     * // 1. 원래 있던 사건의 민원 수 감소
     * if (c.getIncident() != null) {
     * Incident oldIncident = c.getIncident();
     * oldIncident.setComplaintCount(oldIncident.getComplaintCount() - 1);
     * }
     *
     * // 2. 새로운 사건으로 이동
     * c.setIncident(targetIncident);
     * }
     *
     * // 3. 대상 사건의 민원 수 증가
     * targetIncident.setComplaintCount(targetIncident.getComplaintCount() +
     * complaints.size());
     * }
     */
=======
//    // [추가] 제목 변경 로직
//    @Transactional
//    public void updateTitle(Long incidentId, String newTitle) {
//        Incident incident = incidentRepository.findById(incidentId)
//                .orElseThrow(() -> new IllegalArgumentException("사건을 찾을 수 없습니다."));
//        incident.setTitle(newTitle); // Entity에 setTitle 메서드가 있어야 합니다.
//    }
//
//    // [추가] 민원 이동 및 숫자 조정 로직 (핵심)
//    @Transactional
//    public void moveComplaints(Long targetIncidentId, List<Long> complaintIds) {
//        Incident targetIncident = incidentRepository.findById(targetIncidentId)
//                .orElseThrow(() -> new IllegalArgumentException("이동할 대상 사건이 없습니다."));
//
//        List<Complaint> complaints = complaintRepository.findAllById(complaintIds);
//
//        for (Complaint c : complaints) {
//            // 1. 원래 있던 사건의 민원 수 감소
//            if (c.getIncident() != null) {
//                Incident oldIncident = c.getIncident();
//                oldIncident.setComplaintCount(oldIncident.getComplaintCount() - 1);
//            }
//
//            // 2. 새로운 사건으로 이동
//            c.setIncident(targetIncident);
//        }
//
//        // 3. 대상 사건의 민원 수 증가
//        targetIncident.setComplaintCount(targetIncident.getComplaintCount() + complaints.size());
//    }
>>>>>>> d624cf004203b37948ba08108fab49fad3530f84

}