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
        List<IncidentListResponse> content = queryFactory
                .select(Projections.constructor(IncidentListResponse.class,
                        incident,
                        complaint.count(),
                        complaint.receivedAt.min(),
                        complaint.receivedAt.max()))
                .from(incident)
                .leftJoin(complaint).on(complaint.incident.eq(incident))
                .where(
                        containsSearchQuery(searchQuery),
                        eqStatus(status))
                .groupBy(incident.id)
                .having(complaint.count().goe(3))
                .orderBy(complaint.receivedAt.max().desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long count = queryFactory
                .select(incident.count())
                .from(incident)
                .where(
                        containsSearchQuery(searchQuery),
                        eqStatus(status),
                        incident.id.in(
                                JPAExpressions.select(complaint.incident.id)
                                        .from(complaint)
                                        .groupBy(complaint.incident.id)
                                        .having(complaint.count().goe(3))))
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