package com.smart.complaint.routing_system.applicant.entity;

public enum ComplaintStatus {
    RECEIVED,       // 접수
    NORMALIZED,     // 정규화됨 (AI 분석 후)
    RECOMMENDED,    // 부서 추천됨
    IN_PROGRESS,    // 처리중 (DB의 IN_PROGRESS와 매핑, 자바에서는 PROCESSING 대신 이것을 사용 권장)
    PROCESSING,     // (혹시 기존 코드 호환용으로 남겨둠, 필요 없다면 삭제)
    DONE,           // 완료 (민원 처리는 끝났으나 종결 전)
    CLOSED,         // 종결
    CANCELED        // [추가] 취소 (이게 없어서 빨간 줄이 떴습니다)
}