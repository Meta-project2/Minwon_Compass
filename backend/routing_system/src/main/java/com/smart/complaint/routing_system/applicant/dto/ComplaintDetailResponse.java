package com.smart.complaint.routing_system.applicant.dto;

import com.smart.complaint.routing_system.applicant.domain.ComplaintStatus;
import com.smart.complaint.routing_system.applicant.domain.IncidentStatus;
import com.smart.complaint.routing_system.applicant.entity.Complaint;
import com.smart.complaint.routing_system.applicant.entity.ComplaintNormalization;
import com.smart.complaint.routing_system.applicant.entity.Incident;
import com.smart.complaint.routing_system.applicant.entity.ChildComplaint;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Comparator;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ComplaintDetailResponse {
    // 1. 민원 기본 정보 (공통)
    private String id;           // C2026-xxxx
    private Long originalId;     // DB PK
    private String title;

    // [변경] 본문/답변 필드는 history 리스트로 이동하므로 메인에서는 제거하거나 대표값만 유지
    // 하지만 프론트 호환성을 위해 DTO 구조 자체를 바꿉니다.

    private String address;
    private String receivedAt;
    private ComplaintStatus status; // 대표 상태 (부모 기준)
    private String departmentName; // 담당 부서명 (없으면 미배정)
    private String category;       // 업무군

    private Long answeredBy;
    private String managerName;    // 담당자 이름

    // 2. 사건(군집) 정보
    private String incidentId;         // I-2026-xxxx
    private String incidentTitle;
    private IncidentStatus incidentStatus;
    private Long incidentComplaintCount;

    // [신규] 민원 이력 (부모 + 자식들)
    private List<ComplaintHistoryDto> history = new ArrayList<>();

    // 생성자
    public ComplaintDetailResponse(Complaint c, ComplaintNormalization n, Incident i, Long incidentCount, String deptName) {
        // 기본 정보 매핑
        this.originalId = c.getId();
        this.id = String.format("C2026-%04d", c.getId());
        this.title = c.getTitle();
        this.address = c.getAddressText();
        this.receivedAt = c.getReceivedAt() != null
                ? c.getReceivedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"))
                : "";
        this.status = c.getStatus();
        this.departmentName = deptName != null ? deptName : "미배정";
        this.category = "일반행정";

        this.answeredBy = c.getAnsweredBy();

        // 사건 정보 매핑
        if (i != null) {
            this.incidentId = String.format("I-2026-%04d", i.getId());
            this.incidentTitle = i.getTitle();
            this.incidentStatus = i.getStatus();
            this.incidentComplaintCount = incidentCount;
        }

        // [핵심] History 리스트 구성
        // 1) 부모 민원 추가 (정규화 정보 포함)
        ComplaintHistoryDto parentDto = new ComplaintHistoryDto();
        parentDto.setId("P-" + c.getId()); // 고유 키
        parentDto.setOriginalId(c.getId());
        parentDto.setParent(true);
        parentDto.setReceivedAt(this.receivedAt);
        parentDto.setTitle(c.getTitle());
        parentDto.setBody(c.getBody());
        parentDto.setAnswer(c.getAnswer());
        parentDto.setStatus(c.getStatus());
        parentDto.setAnsweredBy(c.getAnsweredBy());

        // 정규화 정보 매핑 (부모에만 존재)
        if (n != null) {
            parentDto.setNeutralSummary(n.getNeutralSummary());
            parentDto.setCoreRequest(n.getCoreRequest());
            parentDto.setCoreCause(n.getCoreCause());
            parentDto.setTargetObject(n.getTargetObject());
            parentDto.setLocationHint(n.getLocationHint());

            List<String> parsedKeywords = new ArrayList<>();
            Object rawKeywords = n.getKeywordsJsonb();

            if (rawKeywords != null) {
                // Case 1: List 타입으로 들어온 경우 (JSON Array)
                if (rawKeywords instanceof List<?>) {
                    for (Object item : (List<?>) rawKeywords) {
                        if (item != null) {
                            String s = String.valueOf(item);
                            // 대괄호[], 따옴표'", 공백 제거 -> 순수 단어만 추출
                            s = s.replaceAll("[\\[\\]'\"]", "").trim();
                            if (!s.isEmpty()) {
                                parsedKeywords.add(s);
                            }
                        }
                    }
                }
                // Case 2: String 타입으로 들어온 경우 (JSON String)
                else if (rawKeywords instanceof String) {
                    String s = (String) rawKeywords;
                    // 통째로 문자열인 경우 분해
                    String[] parts = s.replaceAll("[\\[\\]'\"]", " ").split(",");
                    for (String part : parts) {
                        String clean = part.trim();
                        if (!clean.isEmpty()) {
                            parsedKeywords.add(clean);
                        }
                    }
                }
            }
            parentDto.setKeywords(parsedKeywords);
        }
        this.history.add(parentDto);

        // 2) 자식 민원들 추가
        if (c.getChildComplaints() != null && !c.getChildComplaints().isEmpty()) {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
            for (ChildComplaint child : c.getChildComplaints()) {
                ComplaintHistoryDto childDto = new ComplaintHistoryDto();
                childDto.setId("C-" + child.getId());
                childDto.setOriginalId(child.getId());
                childDto.setParent(false);
                childDto.setReceivedAt(child.getCreatedAt() != null ? child.getCreatedAt().format(formatter) : "");
                childDto.setTitle(child.getTitle()); // 보통 제목이 없으면 날짜 등으로 처리되지만 DB값 사용
                childDto.setBody(child.getBody());
                childDto.setAnswer(child.getAnswer());
                childDto.setStatus(child.getStatus());
                childDto.setAnsweredBy(child.getAnsweredBy());

                // 자식은 정규화 정보 없음
                childDto.setKeywords(Collections.emptyList());

                this.history.add(childDto);
            }
        }

        // 3) 시간순 정렬 (과거 -> 최신)
        // 화면에서는 최신이 아래로 오거나 위로 오거나 선택 가능하지만, 로직상 리스트 순서 보장
        // 여기서는 "받은 시간" 문자열 기준이라 정확하지 않을 수 있으니 ID나 생성일 기준으로 정렬 권장
        // 일단 입력된 순서대로 (부모 -> 자식) 유지
    }

    // 내부 클래스로 이력 DTO 정의
    @Data
    @NoArgsConstructor
    public static class ComplaintHistoryDto {
        private String id; // 유니크 키 (React key용)
        private Long originalId;
        private boolean isParent; // 부모 여부
        private String receivedAt;
        private String title;
        private String body;
        private String answer;
        private Long answeredBy;
        private ComplaintStatus status;

        // 정규화 정보 (부모인 경우에만 값 존재)
        private String neutralSummary;
        private String coreRequest;
        private String coreCause;
        private String targetObject;
        private List<String> keywords;
        private String locationHint;
    }
}