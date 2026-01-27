package com.smart.complaint.routing_system.applicant.service;

import com.smart.complaint.routing_system.applicant.domain.ComplaintStatus; // [필수] Import 추가
import com.smart.complaint.routing_system.applicant.domain.IncidentStatus; // [필수] Import 추가
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

    @Transactional
    public void updateTitle(Long incidentId, String newTitle) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new IllegalArgumentException("해당 사건을 찾을 수 없습니다. ID: " + incidentId));
        incident.updateTitle(newTitle);
    }

    @Transactional
    public void moveComplaints(Long targetIncidentId, List<Long> complaintIds) {
        Incident targetIncident = incidentRepository.findById(targetIncidentId)
                .orElseThrow(() -> new IllegalArgumentException("이동할 대상 사건이 없습니다. ID: " + targetIncidentId));

        List<Complaint> complaintsToMove = complaintRepository.findAllById(complaintIds);

        for (Complaint c : complaintsToMove) {
            Incident oldIncident = c.getIncident();
            if (oldIncident != null && !oldIncident.getId().equals(targetIncidentId)) {
                int currentCount = oldIncident.getComplaintCount() == null ? 0 : oldIncident.getComplaintCount();
                oldIncident.updateComplaintCount(Math.max(0, currentCount - 1));
                refreshIncidentStatus(oldIncident.getId());
            }

            c.setIncident(targetIncident);
        }

        int currentTargetCount = targetIncident.getComplaintCount() == null ? 0 : targetIncident.getComplaintCount();
        targetIncident.updateComplaintCount(currentTargetCount + complaintsToMove.size());
        refreshIncidentStatus(targetIncidentId);
    }

    @Transactional
    public void createNewIncident(List<Long> complaintIds) {
        List<Complaint> complaints = complaintRepository.findAllById(complaintIds);
        if (complaints.isEmpty())
            return;

        Complaint representative = complaints.get(0);
        Incident newIncident = Incident.builder()
                .title("[신규] " + representative.getTitle())
                .status(IncidentStatus.OPEN)
                .districtId(representative.getDistrict() != null ? representative.getDistrict().getId() : null)
                .complaintCount(complaints.size())
                .openedAt(java.time.LocalDateTime.now())
                .build();

        incidentRepository.save(newIncident);

        moveComplaints(newIncident.getId(), complaintIds);
    }

    @Transactional
    public void refreshIncidentStatus(Long incidentId) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new IllegalArgumentException("사건을 찾을 수 없습니다. ID: " + incidentId));

        List<Complaint> complaints = incident.getComplaints();
        if (complaints == null || complaints.isEmpty())
            return;

        boolean allClosed = complaints.stream()
                .allMatch(c -> c.getStatus() == ComplaintStatus.CLOSED || c.getStatus() == ComplaintStatus.CANCELED);

        IncidentStatus newStatus;

        if (allClosed) {
            newStatus = IncidentStatus.CLOSED;
        } else {
            newStatus = IncidentStatus.OPEN;
        }

        if (incident.getStatus() != newStatus) {
            incident.updateStatus(newStatus);
            incidentRepository.save(incident);
        }
    }
}