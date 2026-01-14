package com.smart.complaint.routing_system.applicant.repository;

import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.smart.complaint.routing_system.applicant.domain.IncidentStatus;
import com.smart.complaint.routing_system.applicant.dto.IncidentListResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;

import static com.smart.complaint.routing_system.applicant.entity.QIncident.incident;
import static com.smart.complaint.routing_system.applicant.entity.QComplaint.complaint;

@Repository
@RequiredArgsConstructor
public class IncidentRepositoryImpl implements IncidentRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<IncidentListResponse> searchIncidents(String searchQuery, IncidentStatus status, Pageable pageable) {
        // 1. 데이터 조회 (5개 이상 조건 추가 및 날짜 계산)
        List<IncidentListResponse> content = queryFactory
                .select(Projections.constructor(IncidentListResponse.class,
                        incident,
                        complaint.count(),
                        complaint.createdAt.min(), // 최초 발생일: 군집 내 가장 오래된 민원 날짜
                        complaint.createdAt.max()  // 최근 발생일: 군집 내 가장 최신 민원 날짜
                ))
                .from(incident)
                .leftJoin(complaint).on(complaint.incident.eq(incident))
                .where(
                        containsSearchQuery(searchQuery),
                        eqStatus(status)
                )
                .groupBy(incident.id)
                .having(complaint.count().goe(5)) // [수정] 5개 이상인 군집만 필터링
                .orderBy(complaint.createdAt.max().desc()) // 최신 사건 순 정렬
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        // 2. 전체 개수 조회 (필터 조건 동일 적용)
        Long count = queryFactory
                .select(incident.count())
                .from(incident)
                .where(
                        containsSearchQuery(searchQuery),
                        eqStatus(status),
                        // 서브쿼리로 5개 이상인 것만 카운트
                        incident.id.in(
                                JPAExpressions.select(complaint.incident.id)
                                        .from(complaint)
                                        .groupBy(complaint.incident.id)
                                        .having(complaint.count().goe(5))
                        )
                )
                .fetchOne();

        long total = (count != null) ? count : 0L;

        return new PageImpl<>(content, pageable, total);
    }

    private BooleanExpression containsSearchQuery(String query) {
        if (query == null || query.trim().isEmpty()) {
            return null;
        }
        try {
            long idVal = Long.parseLong(query.replaceAll("[^0-9]", ""));
            return incident.title.contains(query).or(incident.id.eq(idVal));
        } catch (NumberFormatException e) {
            return incident.title.contains(query);
        }
    }

    private BooleanExpression eqStatus(IncidentStatus status) {
        if (status == null) {
            return null;
        }
        return incident.status.eq(status);
    }
}