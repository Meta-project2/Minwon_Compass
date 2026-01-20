package com.smart.complaint.routing_system.applicant.service;

import com.smart.complaint.routing_system.applicant.entity.Complaint; // Complaint 엔티티 임포트 필요
import com.smart.complaint.routing_system.applicant.entity.Incident;
import com.smart.complaint.routing_system.applicant.repository.ComplaintRepository;
import com.smart.complaint.routing_system.applicant.repository.IncidentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final ComplaintRepository complaintRepository;

    // [기존 코드] 주요 사건 조회 (이 부분은 유지)
    public Page<Incident> getMajorIncidents(Pageable pageable) {
        List<Incident> majorList = incidentRepository.findMajorIncidents();

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), majorList.size());

        if (start > majorList.size()) {
            return new PageImpl<>(List.of(), pageable, majorList.size());
        }

        List<Incident> subList = majorList.subList(start, end);
        return new PageImpl<>(subList, pageable, majorList.size());
    }

    // =========================================================
    //  아래부터는 새로 추가된 기능입니다.
    // =========================================================

    /**
     * [기능 1] 사건 제목 수정
     * 화면의 연필 아이콘을 눌러 제목을 바꿀 때 호출됩니다.
     */
    @Transactional // 데이터가 바뀌므로 readOnly = false (기본값)
    public void updateTitle(Long incidentId, String newTitle) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new IllegalArgumentException("해당 사건을 찾을 수 없습니다. ID: " + incidentId));

        // Entity에 추가한 updateTitle 메서드를 사용합니다.
        incident.updateTitle(newTitle);
    }

    /**
     * [기능 2] 민원 이동 (A사건 -> B사건)
     * 민원 리스트에서 체크박스로 선택 후 '이동' 버튼을 누를 때 호출됩니다.
     */
    @Transactional
    public void moveComplaints(Long targetIncidentId, List<Long> complaintIds) {
        // 1. 목표 사건(이사 갈 집) 찾기
        Incident targetIncident = incidentRepository.findById(targetIncidentId)
                .orElseThrow(() -> new IllegalArgumentException("이동할 대상 사건이 없습니다. ID: " + targetIncidentId));

        // 2. 이동할 민원들(이사 갈 사람들)을 DB에서 가져오기
        List<Complaint> complaintsToMove = complaintRepository.findAllById(complaintIds);

        for (Complaint c : complaintsToMove) {
            Incident oldIncident = c.getIncident();

            // 3. 원래 살던 사건(집)에서 인원 수 줄이기
            // (민원이 원래 다른 사건에 속해 있었고, 그게 지금 이동하려는 사건이 아니라면)
            if (oldIncident != null && !oldIncident.getId().equals(targetIncidentId)) {
                // Null 방지를 위해 기본값 0 처리
                int currentCount = oldIncident.getComplaintCount() == null ? 0 : oldIncident.getComplaintCount();
                int newCount = Math.max(0, currentCount - 1); // 음수가 되지 않도록 방어
                oldIncident.updateComplaintCount(newCount);
            }

            // 4. 민원의 소속 사건을 새로운 곳으로 변경
            c.setIncident(targetIncident);
        }

        // 5. 목표 사건(이사 온 집)의 인원 수 증가
        int currentTargetCount = targetIncident.getComplaintCount() == null ? 0 : targetIncident.getComplaintCount();
        targetIncident.updateComplaintCount(currentTargetCount + complaintsToMove.size());
    }
    // [추가] 선택한 민원들로 '새로운 사건(군집)' 생성
    @Transactional
    public void createNewIncident(List<Long> complaintIds) {
        List<Complaint> complaints = complaintRepository.findAllById(complaintIds);
        if (complaints.isEmpty()) return;

        // 1. 새 사건 생성 (제목은 첫 번째 민원 제목을 임시로 사용)
        Complaint representative = complaints.get(0);
        Incident newIncident = Incident.builder()
                .title("[신규] " + representative.getTitle()) // 임시 제목
                .status(com.smart.complaint.routing_system.applicant.domain.IncidentStatus.OPEN) // 상태: 발생
                .districtId(representative.getDistrict() != null ? representative.getDistrict().getId() : null)
                .complaintCount(complaints.size())
                .openedAt(java.time.LocalDateTime.now())
                .build();

        incidentRepository.save(newIncident);

        // 2. 민원 이동 처리 (기존 로직 재활용)
        moveComplaints(newIncident.getId(), complaintIds);
    }

}