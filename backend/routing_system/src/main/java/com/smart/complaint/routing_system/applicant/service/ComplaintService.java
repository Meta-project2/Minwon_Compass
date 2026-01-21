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
import com.smart.complaint.routing_system.applicant.repository.ChildComplaintRepository;
import com.smart.complaint.routing_system.applicant.repository.ComplaintNormalizationRepository;
import com.smart.complaint.routing_system.applicant.repository.ComplaintRepository;
import com.smart.complaint.routing_system.applicant.repository.ComplaintRerouteRepository;
import com.smart.complaint.routing_system.applicant.repository.DepartmentRepository;
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
    private final RestTemplate restTemplate;

    // [수정 26-01-20] 사건 상태 동기화를 위해 IncidentService 주입
    private final IncidentService incidentService;

    /**
     * 1. 담당자 배정 (Assign)
     * - 민원의 상태를 '처리중'으로 변경하고 담당자를 지정합니다.
     */
    public void assignManager(Long complaintId, Long userId) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("해당 민원을 찾을 수 없습니다. ID=" + complaintId));

        complaint.assignManager(userId); // Entity의 편의 메서드 호출

        // [수정 26-01-20] 담당자 배정 시 상태 변경(처리중)에 따른 사건 상태 동기화
        if (complaint.getIncident() != null) {
            incidentService.refreshIncidentStatus(complaint.getIncident().getId());
        }
    }

    /**
     * 2. 답변 저장/전송 (Answer)
     * [수정] 부모 ID로 들어왔지만, 실제 답변은 '가장 최신 민원(자식 포함)'에 저장해야 함.
     */
    public void saveAnswer(Long complaintId, ComplaintAnswerRequest request) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("해당 민원을 찾을 수 없습니다. ID=" + complaintId));

        // 1) 자식 민원이 있는지 확인
        List<ChildComplaint> children = complaint.getChildComplaints();

        if (children != null && !children.isEmpty()) {
            // 2) 자식이 있다면 가장 최신(ID가 큰 것 or CreatedAt이 최신) 자식을 찾음
            ChildComplaint latestChild = children.stream()
                    .max(Comparator.comparing(ChildComplaint::getId))
                    .orElseThrow();

            // 3) 최신 자식에 답변 저장
            if (request.isTemporary()) {
                latestChild.updateAnswerDraft(request.getAnswer());
            } else {
                latestChild.completeAnswer(request.getAnswer(), complaint.getAnsweredBy());
            }
        } else {
            // 4) 자식이 없으면 기존대로 부모(최초 민원)에 답변 저장
            if (request.isTemporary()) {
                complaint.updateAnswerDraft(request.getAnswer());
            } else {
                complaint.completeAnswer(request.getAnswer());
            }
        }

        // [수정 26-01-20] 답변 완료(임시저장 아님) 시 상태 변경에 따른 사건 상태 동기화
        if (!request.isTemporary() && complaint.getIncident() != null) {
            incidentService.refreshIncidentStatus(complaint.getIncident().getId());
        }
    }

    /**
     * 3. 재이관 요청 (Reroute)
     * - 민원 테이블은 건드리지 않고, 재이관 이력 테이블에 요청 데이터를 쌓습니다.
     * - 관리자가 승인하기 전까지는 기존 부서/담당자가 유지됩니다.
     */
    public void requestReroute(Long complaintId, ComplaintRerouteRequest request, Long userId) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("해당 민원을 찾을 수 없습니다. ID=" + complaintId));

        // 재이관 요청 엔티티 생성
        ComplaintReroute reroute = ComplaintReroute.builder()
                .complaint(complaint)
                .originDepartmentId(complaint.getCurrentDepartmentId()) // 현재 부서
                .targetDepartmentId(request.getTargetDeptId()) // 희망 부서
                .requestReason(request.getReason()) // 사유
                .requesterId(userId) // 요청자 (나)
                .status("PENDING") // 대기 상태
                .build();

        rerouteRepository.save(reroute);

        complaint.statusToReroute();

        // [수정 26-01-20] 재이관 요청으로 인한 상태 변경 시 사건 상태 동기화
        if (complaint.getIncident() != null) {
            incidentService.refreshIncidentStatus(complaint.getIncident().getId());
        }
    }

    /**
     * 3-1. 재이관 승인 (Approve) - 관리자용
     * - 이력 상태 APPROVED 변경 + 민원 부서 이동 처리
     */
    public void approveReroute(Long rerouteId, Long reviewerId) {
        ComplaintReroute reroute = rerouteRepository.findById(rerouteId)
                .orElseThrow(() -> new IllegalArgumentException("재이관 요청 내역을 찾을 수 없습니다."));

        if (!"PENDING".equals(reroute.getStatus())) {
            throw new IllegalStateException("이미 처리된 요청입니다.");
        }

        // 이력 상태 업데이트 (APPROVED)
        reroute.process("APPROVED", reviewerId);

        // 민원 실제 부서 이동 및 상태 초기화
        Complaint complaint = reroute.getComplaint();
        complaint.rerouteTo(reroute.getTargetDepartmentId());

        // [수정 26-01-20] 재이관 승인으로 인한 상태 변경 시 사건 상태 동기화
        if (complaint.getIncident() != null) {
            incidentService.refreshIncidentStatus(complaint.getIncident().getId());
        }
    }

    /**
     * 3-2. 재이관 반려 (Reject) - 관리자용
     * - 이력 상태 REJECTED 변경 + 민원 상태 원복
     */
    public void rejectReroute(Long rerouteId, Long reviewerId) {
        ComplaintReroute reroute = rerouteRepository.findById(rerouteId)
                .orElseThrow(() -> new IllegalArgumentException("재이관 요청 내역을 찾을 수 없습니다."));

        if (!"PENDING".equals(reroute.getStatus())) {
            throw new IllegalStateException("이미 처리된 요청입니다.");
        }

        // 이력 상태 업데이트 (REJECTED)
        reroute.process("REJECTED", reviewerId);

        // 민원 상태 원복 (대기중 -> 접수)
        Complaint complaint = reroute.getComplaint();
        complaint.rejectReroute();

        // [수정 26-01-20] 재이관 반려로 인한 상태 원복 시 사건 상태 동기화
        if (complaint.getIncident() != null) {
            incidentService.refreshIncidentStatus(complaint.getIncident().getId());
        }
    }

    /**
     * 4. 담당 취소 (Release)
     * - 담당자를 비우고 상태를 다시 '접수(RECEIVED)'로 되돌립니다.
     */
    public void releaseManager(Long complaintId, Long userId) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("해당 민원을 찾을 수 없습니다."));

        if (complaint.getAnsweredBy() == null || !complaint.getAnsweredBy().equals(userId)) {
            throw new IllegalStateException("본인이 담당한 민원만 취소할 수 있습니다.");
        }
        complaint.releaseManager();

        // [수정 26-01-20] 담당 취소로 인한 상태 변경(접수됨) 시 사건 상태 동기화
        if (complaint.getIncident() != null) {
            incidentService.refreshIncidentStatus(complaint.getIncident().getId());
        }
    }

    /**
     * [수정 26-01-20] 민원 상태 업데이트 (외부 호출용)
     * - 민원 상태를 직접 변경할 때 사용하며, 변경 후 사건 상태도 동기화합니다.
     */
    public void updateComplaintStatus(Long complaintId, ComplaintStatus newStatus) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("해당 민원을 찾을 수 없습니다."));

        // 1. 민원 상태 변경
        complaint.setStatus(newStatus);

        // 종결이라면 종결 일시 기록
        if (newStatus == ComplaintStatus.CLOSED) {
            complaint.setClosedAt(LocalDateTime.now());
        }

        // 2. 소속된 사건(Incident)이 있다면, 사건 상태를 재계산하라고 명령!
        if (complaint.getIncident() != null) {
            incidentService.refreshIncidentStatus(complaint.getIncident().getId());
        }
    }

    @Transactional
    public Long receiveComplaint(String applicantId, ComplaintSubmitDto complaintSubmitDto) {
        log.info("민원 접수 프로세스 시작 - 민원인 ID: {}", applicantId);

        Complaint newComplaint = Complaint.builder()
                .applicantId(Long.parseLong(applicantId))
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
            // 1. 전체 응답 파싱
            AiDto.Response responseWrapper = objectMapper.readValue(rawResponseBody, AiDto.Response.class);

            // 2. data 내 마크다운 제거
            String cleanJson = responseWrapper.data()
                    .replaceAll("```json", "")
                    .replaceAll("```", "")
                    .trim();

            // 3. 실제 분석 데이터 객체로 변환
            AiDto.Analysis analysis = objectMapper.readValue(cleanJson, AiDto.Analysis.class);

            // 4. DB 저장 처리
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
                // 3. ChildComplaint 엔티티 생성 및 저장
                ChildComplaint child = ChildComplaint.builder()
                        .parentComplaint(parent)
                        .title(inquiryDto.title())
                        .body(inquiryDto.body())
                        .status(ComplaintStatus.RECEIVED)
                        .build();

                // 부모 민원의 상태 변화 -> IN_PROGRESS로
                parent.newInquiry();
                complaintRepository.save(parent);
                childComplaintRepository.save(child);

                // [수정 26-01-20] 새 문의 접수로 인한 상태 변경(IN_PROGRESS) 시 사건 상태 동기화
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

        // 민원 취소 처리
        complaint.cancelComplaint();

        log.info("변경 후 상태 찾은 민원: {}, 상태: {}", complaint.getId(), complaint.getStatus());
        complaintRepository.save(complaint);

        // [수정 26-01-20] 민원 취소로 인한 상태 변경 시 사건 상태 동기화
        if (complaint.getIncident() != null) {
            incidentService.refreshIncidentStatus(complaint.getIncident().getId());
        }
    }
}