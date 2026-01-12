package com.smart.complaint.routing_system.applicant.repository;

import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.smart.complaint.routing_system.applicant.domain.IncidentStatus;
import com.smart.complaint.routing_system.applicant.dto.IncidentListResponse;
import lombok.RequiredArgsConstructor;

import java.util.List;

import static com.smart.complaint.routing_system.applicant.entity.QIncident.incident;
import static com.smart.complaint.routing_system.applicant.entity.QComplaint.complaint;

@RequiredArgsConstructor
public class IncidentRepositoryImpl implements IncidentRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<IncidentListResponse> searchIncidents(String searchQuery, IncidentStatus status) {
        return queryFactory
                .select(Projections.constructor(IncidentListResponse.class,
                        incident,
                        complaint.count() // GroupBy로 묶어서 개수 카운트
                ))
                .from(incident)
                .leftJoin(complaint).on(complaint.incident.eq(incident)) // 사건-민원 조인
                .where(
                        containsSearchQuery(searchQuery),
                        eqStatus(status)
                )
                .groupBy(incident.id) // 사건별로 그룹화해서 카운트 계산
                .orderBy(incident.openedAt.desc()) // 최신순 정렬
                .fetch();
    }

    // 동적 쿼리: 검색어 (제목 or ID 포함)
    private BooleanExpression containsSearchQuery(String query) {
        if (query == null || query.trim().isEmpty()) {
            return null;
        }
        // 제목에 포함되거나, ID(Long)가 일치하는지 확인 (ID 검색은 숫자인 경우만)
        try {
            long idVal = Long.parseLong(query.replaceAll("[^0-9]", "")); // "I-2026-12" -> 202612 (단순화)
            return incident.title.contains(query).or(incident.id.eq(idVal));
        } catch (NumberFormatException e) {
            return incident.title.contains(query);
        }
    }

    // 동적 쿼리: 상태 필터
    private BooleanExpression eqStatus(IncidentStatus status) {
        if (status == null) {
            return null;
        }
        return incident.status.eq(status);
    }
}