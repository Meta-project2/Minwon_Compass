package com.smart.complaint.routing_system.applicant.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smart.complaint.routing_system.applicant.config.BusinessException;
import com.smart.complaint.routing_system.applicant.domain.ComplaintStatus;
import com.smart.complaint.routing_system.applicant.domain.ErrorMessage;
import com.smart.complaint.routing_system.applicant.dto.AiDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintAnswerRequest;
import com.smart.complaint.routing_system.applicant.dto.ComplaintInquiryDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintRerouteRequest;
import com.smart.complaint.routing_system.applicant.dto.ComplaintStatDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintSubmitDto;
import com.smart.complaint.routing_system.applicant.dto.KeywordsDto;
import com.smart.complaint.routing_system.applicant.entity.ChildComplaint;
import com.smart.complaint.routing_system.applicant.entity.Complaint;
import com.smart.complaint.routing_system.applicant.entity.ComplaintReroute;
import com.smart.complaint.routing_system.applicant.entity.Department;
import com.smart.complaint.routing_system.applicant.entity.User;
import com.smart.complaint.routing_system.applicant.repository.ChildComplaintRepository;
import com.smart.complaint.routing_system.applicant.repository.ComplaintNormalizationRepository;
import com.smart.complaint.routing_system.applicant.repository.ComplaintRepository;
import com.smart.complaint.routing_system.applicant.repository.ComplaintRerouteRepository;
import com.smart.complaint.routing_system.applicant.repository.DepartmentRepository;
import com.smart.complaint.routing_system.applicant.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ComplaintService {

    private final ObjectMapper objectMapper;
    private final ComplaintRepository complaintRepository;
    private final ComplaintRerouteRepository rerouteRepository;
    private final ChildComplaintRepository childComplaintRepository;
    private final DepartmentRepository departmentRepository;
    private final ComplaintNormalizationRepository complaintNormalizationRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;
    private final IncidentService incidentService;

    public void assignManager(Long complaintId, Long userId) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("해당 민원을 찾을 수 없습니다. ID=" + complaintId));

        complaint.assignManager(userId);

        if (complaint.getIncident() != null) {
            incidentService.refreshIncidentStatus(complaint.getIncident().getId());
        }
    }

    public void saveAnswer(Long complaintId, ComplaintAnswerRequest request) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("해당 민원을 찾을 수 없습니다. ID=" + complaintId));

        List<ChildComplaint> children = complaint.getChildComplaints();

        if (children != null && !children.isEmpty()) {
            ChildComplaint latestChild = children.stream()
                    .max(Comparator.comparing(ChildComplaint::getId))
                    .orElseThrow();

            if (request.isTemporary()) {
                latestChild.updateAnswerDraft(request.getAnswer());
            } else {
                latestChild.completeAnswer(request.getAnswer(), complaint.getAnsweredBy());
                complaint.updateStatustoComplete();
            }
        } else {
            if (request.isTemporary()) {
                complaint.updateAnswerDraft(request.getAnswer());
            } else {
                complaint.completeAnswer(request.getAnswer());
            }
        }

        if (!request.isTemporary() && complaint.getIncident() != null) {
            incidentService.refreshIncidentStatus(complaint.getIncident().getId());
        }
    }

    public void requestReroute(Long complaintId, ComplaintRerouteRequest request, Long userId) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("해당 민원을 찾을 수 없습니다. ID=" + complaintId));

        ComplaintReroute reroute = ComplaintReroute.builder()
                .complaint(complaint)
                .originDepartmentId(complaint.getCurrentDepartmentId())
                .targetDepartmentId(request.getTargetDeptId())
                .requestReason(request.getReason())
                .requesterId(userId)
                .status("PENDING")
                .build();

        rerouteRepository.save(reroute);

        complaint.statusToReroute();

        if (complaint.getIncident() != null) {
            incidentService.refreshIncidentStatus(complaint.getIncident().getId());
        }
    }

    public void approveReroute(Long rerouteId, Long reviewerId) {
        ComplaintReroute reroute = rerouteRepository.findById(rerouteId)
                .orElseThrow(() -> new IllegalArgumentException("재이관 요청 내역을 찾을 수 없습니다."));

        if (!"PENDING".equals(reroute.getStatus())) {
            throw new IllegalStateException("이미 처리된 요청입니다.");
        }

        reroute.process("APPROVED", reviewerId);
        Complaint complaint = reroute.getComplaint();
        complaint.rerouteTo(reroute.getTargetDepartmentId());

        if (complaint.getIncident() != null) {
            incidentService.refreshIncidentStatus(complaint.getIncident().getId());
        }
    }

    public void rejectReroute(Long rerouteId, Long reviewerId) {
        ComplaintReroute reroute = rerouteRepository.findById(rerouteId)
                .orElseThrow(() -> new IllegalArgumentException("재이관 요청 내역을 찾을 수 없습니다."));

        if (!"PENDING".equals(reroute.getStatus())) {
            throw new IllegalStateException("이미 처리된 요청입니다.");
        }

        reroute.process("REJECTED", reviewerId);
        Complaint complaint = reroute.getComplaint();
        complaint.rejectReroute();

        if (complaint.getIncident() != null) {
            incidentService.refreshIncidentStatus(complaint.getIncident().getId());
        }
    }

    public void releaseManager(Long complaintId, Long userId) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("해당 민원을 찾을 수 없습니다."));

        if (complaint.getAnsweredBy() == null || !complaint.getAnsweredBy().equals(userId)) {
            throw new IllegalStateException("본인이 담당한 민원만 취소할 수 있습니다.");
        }
        complaint.releaseManager();
        if (complaint.getIncident() != null) {
            incidentService.refreshIncidentStatus(complaint.getIncident().getId());
        }
    }

    public void updateComplaintStatus(Long complaintId, ComplaintStatus newStatus) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("해당 민원을 찾을 수 없습니다."));

        complaint.setStatus(newStatus);
        if (newStatus == ComplaintStatus.CLOSED) {
            complaint.setClosedAt(LocalDateTime.now());
        }
        if (complaint.getIncident() != null) {
            incidentService.refreshIncidentStatus(complaint.getIncident().getId());
        }
    }

    private boolean isPureNumeric(String str) {
        return str != null && str.matches("\\d+");
    }

    @Transactional
    public Long receiveComplaint(String applicantId, ComplaintSubmitDto complaintSubmitDto) {
        log.info("민원 접수 프로세스 시작 - 민원인 ID: {}", applicantId);

        Long actualUserId = null;

        if (isPureNumeric(applicantId)) {
            if (userRepository.existsById(Long.parseLong(applicantId))) {
                actualUserId = Long.parseLong(applicantId);
            }
        }

        if (actualUserId == null) {
            User socialUser = userRepository.findByProviderIdLike(applicantId)
                    .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + applicantId));
            actualUserId = socialUser.getId();
        }

        Complaint newComplaint = Complaint.builder()
                .applicantId(actualUserId)
                .title(complaintSubmitDto.getTitle())
                .body(complaintSubmitDto.getBody())
                .addressText(complaintSubmitDto.getAddressText())
                .lat(complaintSubmitDto.getLat())
                .lon(complaintSubmitDto.getLon())
                .status(ComplaintStatus.RECEIVED)
                .receivedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        complaintRepository.save(newComplaint);
        log.info("민원 기본 저장 완료. ID: {}", newComplaint.getId());

        return newComplaint.getId();
    }

    @Transactional
    public void processAiResponse(String rawResponseBody, Long complaintId) {
        try {
            AiDto.Response responseWrapper = objectMapper.readValue(rawResponseBody, AiDto.Response.class);

            String cleanJson = responseWrapper.data()
                    .replaceAll("```json", "")
                    .replaceAll("```", "")
                    .trim();

            AiDto.Analysis analysis = objectMapper.readValue(cleanJson, AiDto.Analysis.class);

            saveNormalizationData(complaintId, analysis, responseWrapper.embedding());

        } catch (Exception e) {
            log.error("AI 데이터 파싱 및 저장 실패: {}", e.getMessage());
        }
    }

    private void saveNormalizationData(Long complaintId, AiDto.Analysis analysis, float[] embeddingArray)
            throws Exception {

        List<String> keywordList = Arrays.stream(analysis.originalAnalysis().keywords().split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        String keywordsJson = objectMapper.writeValueAsString(keywordList);
        String routingRankJson = objectMapper.writeValueAsString(analysis.recommendations());

        String neutralSummary = String.format("%s %s %s",
                analysis.originalAnalysis().topic(),
                analysis.originalAnalysis().keywords(),
                analysis.originalAnalysis().category());

        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new BusinessException(ErrorMessage.COMPLAINT_NOT_FOUND));

        String targetDeptName = "미지정";
        if (!analysis.recommendations().isEmpty()) {
            String fullDept = analysis.recommendations().get(0).recommendedDept();
            String[] parts = fullDept.split(" ");
            targetDeptName = parts[parts.length - 1].trim();
        }

        Long nullDepartment = departmentRepository.findByName("미정")
                .map(Department::getId)
                .orElse(1L);

        Long departmentId = departmentRepository.findByName(targetDeptName)
                .map(Department::getId)
                .orElse(nullDepartment);

        complaint.setDepartment(departmentId);
        complaint.setAiPredicted(departmentId);

        complaintNormalizationRepository.insertNormalization(
                complaintId,
                analysis.recommendations().isEmpty() ? "미지정" : analysis.recommendations().get(0).recommendedDept(),
                neutralSummary,
                analysis.originalAnalysis().topic(),
                analysis.originalAnalysis().category(),
                keywordsJson,
                routingRankJson,
                embeddingArray,
                true);
    }

    public void analyzeComplaint(Long id, String applicantId, ComplaintSubmitDto complaintSubmitDto) {
        String pythonUrl = "http://complaint-ai-server:8000/api/complaints/preprocess";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, Object> pythonRequest = new HashMap<>();
        pythonRequest.put("id", id);
        pythonRequest.put("title", complaintSubmitDto.getTitle());
        pythonRequest.put("body", complaintSubmitDto.getBody());
        pythonRequest.put("addressText", complaintSubmitDto.getAddressText());
        pythonRequest.put("lat", complaintSubmitDto.getLat());
        pythonRequest.put("lon", complaintSubmitDto.getLon());
        pythonRequest.put("applicantId", applicantId);
        pythonRequest.put("districtId", 3);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(pythonRequest, headers);
        try {
            ResponseEntity<String> response = restTemplate.postForEntity(pythonUrl, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                String responseBody = response.getBody();
                log.info("AI 분석 서버 응답 수신 성공");
                processAiResponse(responseBody, id);
                log.info("AI 분석 및 정규화 데이터 저장 성공");
            } else {
                log.warn("AI 분석 서버 응답은 성공이나 상태 코드가 2xx가 아님: {}", response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("AI 분석 서버 통신 실패 (민원은 접수됨): {}", e.getMessage());
        }
    }

    @Transactional
    public void crateNewInquiry(Long id, ComplaintInquiryDto inquiryDto) {
        try {
            // 1. 부모 민원 존재 여부 및 상태 확인
            Complaint parent = complaintRepository.findById(id)
                    .orElseThrow(() -> new BusinessException(ErrorMessage.COMPLAINT_NOT_FOUND));

            // 2. 답변이 완료되지 않은 상태라면 추가 문의 제한
            if (parent.getStatus() != ComplaintStatus.RESOLVED && parent.getStatus() != ComplaintStatus.CLOSED) {
                throw new BusinessException(ErrorMessage.PENDING_ANSWER_EXISTS);
            }

            try {
                ChildComplaint child = ChildComplaint.builder()
                        .parentComplaint(parent)
                        .title(inquiryDto.title())
                        .body(inquiryDto.body())
                        .status(ComplaintStatus.RECEIVED)
                        .build();
                parent.newInquiry();
                complaintRepository.save(parent);
                childComplaintRepository.save(child);

                if (parent.getIncident() != null) {
                    incidentService.refreshIncidentStatus(parent.getIncident().getId());
                }

            } catch (Exception e) {
                log.error("새 문의 저장 중 문제 발생: {}", e.getMessage());
                throw new BusinessException(ErrorMessage.DATABASE_ERROR);
            }
        } catch (Exception e) {
            log.error("새 문의 저장 중 문제 발생: {}", e.getMessage());
        }
    }

    public ComplaintStatDto calculateStat() {
        try {
            return complaintRepository.geComplaintStatus();
        } catch (Exception e) {
            log.error("통계 분석 중 문제 발생: {}", e.getMessage());
            throw new BusinessException(ErrorMessage.DATABASE_ERROR);
        }
    }

    public List<KeywordsDto> calculateKeywords() {
        try {
            return complaintRepository.calculateKeywords();
        } catch (Exception e) {
            log.error("키워드 계산 중 문제 발생: {}", e.getMessage());
            throw new BusinessException(ErrorMessage.DATABASE_ERROR);
        }
    }

    @Transactional
    public void updateStatus(Long id) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorMessage.COMPLAINT_NOT_FOUND));

        log.info("찾은 민원: {}, 상태: {}", complaint.getId(), complaint.getStatus());
        complaint.cancelComplaint();
        log.info("변경 후 상태 찾은 민원: {}, 상태: {}", complaint.getId(), complaint.getStatus());
        if (complaint.getIncident() != null) {
            incidentService.refreshIncidentStatus(complaint.getIncident().getId());
        }
    }

    @Transactional
    public void closeComplaint(Long id) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorMessage.COMPLAINT_NOT_FOUND));
        log.info("찾은 민원: {}, 상태: {}", complaint.getId(), complaint.getStatus());
        complaint.closeComplaint();
        log.info("변경 후 상태 찾은 민원: {}, 상태: {}", complaint.getId(), complaint.getStatus());
    }
}