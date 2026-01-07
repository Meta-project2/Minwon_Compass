package com.smart.complaint.routing_system.applicant.dto;

import java.sql.Date;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
// 원본 민원 DTO
public class ComplaintDto {

    private Long id;
    private String applicant;
    // 접수 시간
    private Date received_at;
    // 제목
    private String title;
    // 본문
    private String body;
    private String answerd_by;
    private String answer;
    // 주소
    private String address_text;
    // 위도 경도
    private Double lat;
    private Double lon;
    // 발생 구역
    private String district;
    // 민원 처리 상황
    private String complaint_status;
    // 긴급도
    private String urgency_level;
    // 현재 배정된 부서
    private Long current_department_id;
    // 민원 그룹화
    private Long incident_id;
    // 그룹화된 시간
    private Date incident_linked_at;
    // AI가 계산한 사건 유사도 점수
    private Double incident_link_score;
    // 생성 시간
    private Date created_at;
    // 업데이트된 시간
    private Date updated_at;
    // 종결 시간
    private Date closed_at;

    
}
