package com.smart.complaint.routing_system.applicant.repository;

import com.querydsl.core.Tuple;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.core.types.dsl.NumberTemplate;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.smart.complaint.routing_system.applicant.domain.ComplaintStatus;
import com.smart.complaint.routing_system.applicant.domain.UrgencyLevel;
import com.smart.complaint.routing_system.applicant.dto.ComplaintDetailResponse;
import com.smart.complaint.routing_system.applicant.dto.ComplaintResponse;
import com.smart.complaint.routing_system.applicant.dto.ComplaintSearchCondition;
import com.smart.complaint.routing_system.applicant.dto.ComplaintSearchResult;
import com.smart.complaint.routing_system.applicant.entity.Complaint;
import com.smart.complaint.routing_system.applicant.entity.Incident;
import com.smart.complaint.routing_system.applicant.entity.QComplaint;
import com.smart.complaint.routing_system.applicant.entity.QComplaintNormalization;
import com.smart.complaint.routing_system.applicant.entity.QIncident;
import com.smart.complaint.routing_system.applicant.entity.QDepartment;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.stream.Collectors;

import static com.smart.complaint.routing_system.applicant.entity.QComplaint.complaint;

@Repository
@RequiredArgsConstructor
public class ComplaintRepositoryImpl implements ComplaintRepositoryCustom {

    private final JPAQueryFactory queryFactory;
    private final QComplaintNormalization normalization = QComplaintNormalization.complaintNormalization;

    @Override
    public List<ComplaintResponse> search(Long departmentId, ComplaintSearchCondition condition) {
        List<Tuple> results = queryFactory
                .select(complaint, normalization.neutralSummary)
                .from(complaint)
                .leftJoin(normalization).on(normalization.complaint.eq(complaint))
                .where(
                        keywordContains(condition.getKeyword()),
                        statusEq(condition.getStatus()),
                        urgencyEq(condition.getUrgency()),
                        hasIncident(condition.getHasIncident())
                )
                .orderBy(getOrderSpecifier(condition.getSort()))
                .fetch();

        return results.stream()
                .map(tuple -> {
                    Complaint c = tuple.get(complaint);
                    String summary = tuple.get(normalization.neutralSummary);
                    if (c == null) return null;
                    ComplaintResponse dto = new ComplaintResponse(c);
                    dto.setNeutralSummary(summary);
                    return dto;
                })
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
    }

    @Override
    public List<ComplaintSearchResult> findSimilarComplaint(double[] queryEmbedding, int limit) {
        String vectorString = java.util.Arrays.toString(queryEmbedding);
        NumberTemplate<Double> similarity = Expressions.numberTemplate(Double.class,
                "1 - ({0} <-> cast({1} as vector))",
                normalization.embedding,
                vectorString);

        return queryFactory
                .select(Projections.constructor(ComplaintSearchResult.class,
                        complaint.id,
                        complaint.title,
                        complaint.body,
                        similarity.as("score")
                ))
                .from(normalization)
                .join(normalization.complaint, complaint)
                .where(normalization.isCurrent.isTrue())
                .orderBy(similarity.desc())
                .limit(limit)
                .fetch();
    }

    private BooleanExpression keywordContains(String keyword) {
        if (keyword == null || keyword.isEmpty()) return null;
        return complaint.title.contains(keyword).or(complaint.body.contains(keyword));
    }

    private BooleanExpression statusEq(ComplaintStatus status) {
        return status != null ? complaint.status.eq(status) : null;
    }

    private BooleanExpression urgencyEq(UrgencyLevel urgency) {
        return urgency != null ? complaint.urgency.eq(urgency) : null;
    }

    private BooleanExpression hasIncident(Boolean hasIncident) {
        if (hasIncident == null) return null;
        return hasIncident ? complaint.incident.isNotNull() : complaint.incident.isNull();
    }

    private OrderSpecifier<?> getOrderSpecifier(String sort) {
        if ("urgency".equals(sort)) return complaint.urgency.desc();
        if ("status".equals(sort)) return complaint.status.asc();
        return complaint.receivedAt.desc();
    }

    @Override
    public ComplaintDetailResponse getComplaintDetail(Long complaintId) {
        QComplaint complaint = QComplaint.complaint;
        QComplaintNormalization normalization = QComplaintNormalization.complaintNormalization;
        QIncident incident = QIncident.incident;
        QDepartment department = QDepartment.department;

        // [핵심 수정] 에러 방지를 위해 normalization 엔티티 전체가 아닌 필드별로 개별 조회
        Tuple result = queryFactory
                .select(
                        complaint,
                        normalization.neutralSummary,  // 필요한 데이터만 콕 집어서 조회
                        normalization.coreRequest,
                        normalization.keywordsJsonb,
                        incident,
                        department.name
                )
                .from(complaint)
                .leftJoin(normalization).on(normalization.complaint.eq(complaint))
                .leftJoin(complaint.incident, incident)
                .leftJoin(department).on(complaint.currentDepartmentId.eq(department.id))
                .where(complaint.id.eq(complaintId))
                .fetchOne();

        if (result == null || result.get(complaint) == null) return null;

        Complaint c = result.get(complaint);
        Incident i = result.get(incident);

        // 사건 통계 정보 조회 (구성민원수 + 평균 처리 시간)
        Long iCount = 0L;
        String avgTimeStr = "0시간";

        if (i != null) {
            // 1. 민원 개수 조회
            iCount = queryFactory
                    .select(complaint.count())
                    .from(complaint)
                    .where(complaint.incident.id.eq(i.getId()))
                    .fetchOne();

            // 2. 평균 처리 시간 계산 (SQL: AVG(종결시간 - 접수시간))
            // PostgreSQL의 EXTRACT(EPOCH)를 사용하여 초 단위로 평균을 구한 뒤 시간으로 환산합니다.
            Double avgSeconds = queryFactory
                    .select(Expressions.numberTemplate(Double.class,
                            "EXTRACT(EPOCH FROM AVG({0} - {1}))",
                            complaint.closedAt, complaint.createdAt))
                    .from(complaint)
                    .where(complaint.incident.id.eq(i.getId())
                            .and(complaint.closedAt.isNotNull())) // 종결된 민원만 계산
                    .fetchOne();

            if (avgSeconds != null) {
                double hours = avgSeconds / 3600.0;
                avgTimeStr = String.format("%.1f시간", hours);
            }
        }

        // 결과 반환 (DTO 생성자 규격에 맞춰 조립)
        ComplaintDetailResponse response = new ComplaintDetailResponse(
                c,
                i,
                (iCount != null ? iCount : 0L),
                result.get(department.name)
        );

        // 정규화 데이터 추가 세팅 (null 체크 후 삽입)
        response.setAvgProcessTime(avgTimeStr);
        response.setNeutralSummary(result.get(normalization.neutralSummary));

        return response;
    }
}