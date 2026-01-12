package com.smart.complaint.routing_system.applicant.dto;

import java.sql.Date;

import lombok.Builder;

@Builder
// 원본 민원 DTO
public record ComplaintDto(
        Long id,
        String applicant,
        // 접수 시간
        Date received_at,
        // 제목
        String title,
        // 본문
        String body,
        String answerd_by,
        String answer,
        // 주소
        String address_text,
        // 위도 경도
        Double lat,
        Double lon,
        // 발생 구역
        String district,
        // 민원 처리 상황
        String complaint_status,
        // 긴급도
        String urgency_level,
        // 현재 배정된 부서
        Long current_department_id,
        // 민원 그룹화
        Long incident_id,
        // 그룹화된 시간
        Date incident_linked_at,
        // AI가 계산한 사건 유사도 점수
        Double incident_link_score,
        // 생성 시간
        Date created_at,
        // 업데이트된 시간
        Date updated_at,
        // 종결 시간
        Date closed_at
) {}
