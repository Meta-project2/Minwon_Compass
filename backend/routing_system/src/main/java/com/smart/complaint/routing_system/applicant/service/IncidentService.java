package com.smart.complaint.routing_system.applicant.service;

import com.smart.complaint.routing_system.applicant.domain.ComplaintStatus; // [필수] Import 추가
import com.smart.complaint.routing_system.applicant.domain.IncidentStatus;   // [필수] Import 추가
import com.smart.complaint.routing_system.applicant.entity.Complaint;
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

    // [기존 코드] 주요 사건 조회
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
    //  새로 추가 및 수정된 기능
    // =========================================================

    /**
     * [기능 1] 사건 제목 수정
     */
    @Transactional
    public void updateTitle(Long incidentId, String newTitle) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new IllegalArgumentException("해당 사건을 찾을 수 없습니다. ID: " + incidentId));
        incident.updateTitle(newTitle);
    }

    /**
     * [기능 2] 민원 이동 (A사건 -> B사건)
     * 민원이 이동하면, '이사 나간 집(A)'과 '이사 들어온 집(B)' 양쪽의 상태를 다시 계산해야 합니다.
     */
    @Transactional
    public void moveComplaints(Long targetIncidentId, List<Long> complaintIds) {
        Incident targetIncident = incidentRepository.findById(targetIncidentId)
                .orElseThrow(() -> new IllegalArgumentException("이동할 대상 사건이 없습니다. ID: " + targetIncidentId));

        List<Complaint> complaintsToMove = complaintRepository.findAllById(complaintIds);

        for (Complaint c : complaintsToMove) {
            Incident oldIncident = c.getIncident();

            // 1. 원래 살던 사건(집) 처리
            if (oldIncident != null && !oldIncident.getId().equals(targetIncidentId)) {
                int currentCount = oldIncident.getComplaintCount() == null ? 0 : oldIncident.getComplaintCount();
                oldIncident.updateComplaintCount(Math.max(0, currentCount - 1));

                // [중요] 민원이 빠져나갔으니, 이전 사건의 상태를 재계산 (예: 남은 게 다 종결이면 CLOSED로 변경)
                refreshIncidentStatus(oldIncident.getId());
            }

            // 2. 새로운 사건으로 이동
            c.setIncident(targetIncident);
        }

        // 3. 목표 사건 처리
        int currentTargetCount = targetIncident.getComplaintCount() == null ? 0 : targetIncident.getComplaintCount();
        targetIncident.updateComplaintCount(currentTargetCount + complaintsToMove.size());

        // [중요] 새 식구가 들어왔으니, 목표 사건의 상태를 재계산 (예: 들어온 게 미결이면 OPEN으로 변경)
        refreshIncidentStatus(targetIncidentId);
    }

    /**
     * [기능 3] 선택한 민원들로 '새로운 사건(군집)' 생성
     */
    @Transactional
    public void createNewIncident(List<Long> complaintIds) {
        List<Complaint> complaints = complaintRepository.findAllById(complaintIds);
        if (complaints.isEmpty()) return;

        Complaint representative = complaints.get(0);
        Incident newIncident = Incident.builder()
                .title("[신규] " + representative.getTitle())
                .status(IncidentStatus.OPEN) // 초기 생성은 무조건 OPEN
                .districtId(representative.getDistrict() != null ? representative.getDistrict().getId() : null)
                .complaintCount(complaints.size())
                .openedAt(java.time.LocalDateTime.now())
                .build();

        incidentRepository.save(newIncident);

        // 이동 로직을 호출하여 관계 설정 및 상태 동기화 수행
        moveComplaints(newIncident.getId(), complaintIds);
    }

    /**
     * [기능 4] 민원 상태 기반 사건 상태 자동 동기화 (2단계: OPEN/CLOSED)
     * - moveComplaints 등에서 호출되어 상태를 최신화합니다.
     */
    @Transactional
    public void refreshIncidentStatus(Long incidentId) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new IllegalArgumentException("사건을 찾을 수 없습니다. ID: " + incidentId));

        List<Complaint> complaints = incident.getComplaints();

        // 민원이 하나도 없게 되면(모두 이동 등), 일단 OPEN으로 두거나 정책에 따라 처리 (여기선 리턴)
        if (complaints == null || complaints.isEmpty()) return;

        // "모든 민원이 종결(CLOSED) 또는 취소(CANCELED)인가?"
        boolean allClosed = complaints.stream()
                .allMatch(c -> c.getStatus() == ComplaintStatus.CLOSED || c.getStatus() == ComplaintStatus.CANCELED);

        IncidentStatus newStatus;

        if (allClosed) {
            newStatus = IncidentStatus.CLOSED; // 모두 끝났으면 '종결'
        } else {
            newStatus = IncidentStatus.OPEN;   // 하나라도 미결이면 '대응중'
        }

        // 상태가 달라졌을 때만 DB 업데이트 (불필요한 쿼리 방지)
        if (incident.getStatus() != newStatus) {
            incident.updateStatus(newStatus);
            incidentRepository.save(incident);
        }
    }
}