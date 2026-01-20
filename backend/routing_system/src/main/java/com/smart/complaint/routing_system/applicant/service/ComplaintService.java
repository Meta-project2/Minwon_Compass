package com.smart.complaint.routing_system.applicant.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smart.complaint.routing_system.applicant.config.BusinessException;
import com.smart.complaint.routing_system.applicant.domain.ComplaintStatus;
import com.smart.complaint.routing_system.applicant.domain.ErrorMessage;
import com.smart.complaint.routing_system.applicant.dto.AiDto;
import com.smart.complaint.routing_system.applicant.dto.AiDto.Analysis;
import com.smart.complaint.routing_system.applicant.dto.ComplaintAnswerRequest;
import com.smart.complaint.routing_system.applicant.dto.ComplaintInquiryDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintRerouteRequest;
import com.smart.complaint.routing_system.applicant.dto.ComplaintStatDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintSubmitDto;
import com.smart.complaint.routing_system.applicant.dto.KeywordsDto;
import com.smart.complaint.routing_system.applicant.entity.ChildComplaint;
import com.smart.complaint.routing_system.applicant.entity.Complaint;
import com.smart.complaint.routing_system.applicant.entity.ComplaintNormalization;
import com.smart.complaint.routing_system.applicant.entity.ComplaintReroute;
import com.smart.complaint.routing_system.applicant.entity.Department;
import com.smart.complaint.routing_system.applicant.repository.ChildComplaintRepository;
import com.smart.complaint.routing_system.applicant.repository.ComplaintNormalizationRepository;
import com.smart.complaint.routing_system.applicant.repository.ComplaintRepository;
import com.smart.complaint.routing_system.applicant.repository.ComplaintRerouteRepository;
import com.smart.complaint.routing_system.applicant.repository.DepartmentRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
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

    /**
     * 1. 담당자 배정 (Assign)
     * - 민원의 상태를 '처리중'으로 변경하고 담당자를 지정합니다.
     */
    public void assignManager(Long complaintId, Long userId) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("해당 민원을 찾을 수 없습니다. ID=" + complaintId));

        // 이미 다른 담당자가 있는지 체크하는 로직을 추가할 수 있습니다.
        // if (complaint.getAnsweredBy() != null &&
        // !complaint.getAnsweredBy().equals(userId)) { ... }

        complaint.assignManager(userId); // Entity의 편의 메서드 호출
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
            // ID Auto Increment 가정이면 ID max가 최신
            ChildComplaint latestChild = children.stream()
                    .max(Comparator.comparing(ChildComplaint::getId))
                    .orElseThrow();

            // 3) 최신 자식에 답변 저장
            if (request.isTemporary()) {
                latestChild.updateAnswerDraft(request.getAnswer());
            } else {
                // 자식 민원 종결 처리 (담당자는 일단 부모 담당자를 따라가거나, 현재 세션 유저를 넣어야 함)
                // 여기선 간단히 부모 담당자를 따라간다고 가정하거나, 컨트롤러에서 userId를 받아와야 함.
                // 일단 null 대신 complaint.getAnsweredBy() 사용
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
                .status(ComplaintStatus.RECEIVED) // 테이블의 DEFAULT값과 일치시키거나 열거형 사용
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
            // 1. 전체 응답 파싱 (status, data) -> {"status": "success", "data": "..."} 받아온 데이터
            AiDto.Response responseWrapper = objectMapper.readValue(rawResponseBody, AiDto.Response.class);

            // 2. data 내 마크다운 제거 (```json ... ``` 부분 추출)
            // langflow는 앞에 '''json을 붙인다
            String cleanJson = responseWrapper.data()
                    .replaceAll("```json", "")
                    .replaceAll("```", "")
                    .trim();

            // 3. 실제 분석 데이터 객체로 변환 -> 추천 순위와 분석 데이터
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

        // 2. 문자열 파싱: "도로과"만 추출
        String targetDeptName = "미지정";
        if (!analysis.recommendations().isEmpty()) {
            String fullDept = analysis.recommendations().get(0).recommendedDept();
            String[] parts = fullDept.split(" ");
            targetDeptName = parts[parts.length - 1].trim();
        }

        Long nullDepartment = departmentRepository.findByName("미정")
                .map(Department::getId)
                .orElse(1L);
        // 2. ID 조회 및 세팅 (조회 실패 시 0L)
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
                embeddingArray, // float[]를 그대로 전달
                true);
    }

    public void analyzeComplaint(Long id, String applicantId, ComplaintSubmitDto complaintSubmitDto) {
        String pythonUrl = "http://complaint-ai-server:8000/api/complaints/preprocess";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, Object> pythonRequest = new HashMap<>();
        pythonRequest.put("id", id); // 생성된 ID 추가
        pythonRequest.put("title", complaintSubmitDto.getTitle());
        pythonRequest.put("body", complaintSubmitDto.getBody());
        pythonRequest.put("addressText", complaintSubmitDto.getAddressText());
        pythonRequest.put("lat", complaintSubmitDto.getLat());
        pythonRequest.put("lon", complaintSubmitDto.getLon());
        pythonRequest.put("applicantId", applicantId);
        pythonRequest.put("districtId", 3);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(pythonRequest, headers);
        try {
            // Python 서버 호출 (POST)
            ResponseEntity<String> response = restTemplate.postForEntity(pythonUrl, entity, String.class);

            // 2. 응답 상태가 성공(2xx)인 경우에만 후속 처리 진행
            if (response.getStatusCode().is2xxSuccessful()) {
                String responseBody = response.getBody(); // 내용물(String)만 추출

                log.info("AI 분석 서버 응답 수신 성공");

                // 3. 추출한 String 본문을 파싱 로직으로 전달 id는 민원의 PK
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
            // status가 RESOLVED(답변완료)나 CLOSED(종결)가 아닌 경우 예외 발생
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

            } catch (Exception e) {
                log.error("새 문의 저장 중 문제 발생: {}", e.getMessage());
                throw new BusinessException(ErrorMessage.DATABASE_ERROR);
            }
        } catch (Exception e) {
            log.error("새 문의 저장 중 문제 발생: {}", e.getMessage());
        }
    }

    public ComplaintStatDto calculateStat() {
        ComplaintStatDto statDto = null;
        try {
            statDto = complaintRepository.geComplaintStatus();
        } catch (Exception e) {
            log.error("통계 분석 중 문제 발생: {}", e.getMessage());
            throw new BusinessException(ErrorMessage.DATABASE_ERROR);
        }
        return statDto;
    }

    public List<KeywordsDto> calculateKeywords() {
        try {
            List<KeywordsDto> keywordsDtos = complaintRepository.calculateKeywords();
            return keywordsDtos;
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
        complaintRepository.save(complaint);
    }
}