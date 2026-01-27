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

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ComplaintDetailResponse {
    private String id;
    private Long originalId;
    private String title;

    private String address;
    private String receivedAt;
    private ComplaintStatus status;
    private String departmentName;
    private String category;

    private Long answeredBy;
    private String managerName;

    private String incidentId;
    private String incidentTitle;
    private IncidentStatus incidentStatus;
    private Long incidentComplaintCount;

    private List<ComplaintHistoryDto> history = new ArrayList<>();

    public ComplaintDetailResponse(Complaint c, ComplaintNormalization n, Incident i, Long incidentCount,
            String deptName) {
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

        if (i != null) {
            this.incidentId = String.format("I-2026-%04d", i.getId());
            this.incidentTitle = i.getTitle();
            this.incidentStatus = i.getStatus();
            this.incidentComplaintCount = incidentCount;
        }

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

        if (n != null) {
            parentDto.setNeutralSummary(n.getNeutralSummary());
            parentDto.setCoreRequest(n.getCoreRequest());
            parentDto.setCoreCause(n.getCoreCause());
            parentDto.setTargetObject(n.getTargetObject());
            parentDto.setLocationHint(n.getLocationHint());

            List<String> parsedKeywords = new ArrayList<>();
            Object rawKeywords = n.getKeywordsJsonb();

            if (rawKeywords != null) {
                if (rawKeywords instanceof List<?>) {
                    for (Object item : (List<?>) rawKeywords) {
                        if (item != null) {
                            String s = String.valueOf(item);
                            s = s.replaceAll("[\\[\\]'\"]", "").trim();
                            if (!s.isEmpty()) {
                                parsedKeywords.add(s);
                            }
                        }
                    }
                } else if (rawKeywords instanceof String) {
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
                childDto.setKeywords(Collections.emptyList());

                this.history.add(childDto);
            }
        }
    }

    @Data
    @NoArgsConstructor
    public static class ComplaintHistoryDto {
        private String id;
        private Long originalId;
        private boolean isParent;
        private String receivedAt;
        private String title;
        private String body;
        private String answer;
        private Long answeredBy;
        private ComplaintStatus status;
        private String neutralSummary;
        private String coreRequest;
        private String coreCause;
        private String targetObject;
        private List<String> keywords;
        private String locationHint;
    }
}