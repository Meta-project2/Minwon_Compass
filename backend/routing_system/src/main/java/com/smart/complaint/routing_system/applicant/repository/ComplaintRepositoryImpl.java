package com.smart.complaint.routing_system.applicant.repository;

import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.core.types.dsl.NumberTemplate;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.smart.complaint.routing_system.applicant.domain.ComplaintStatus;
import com.smart.complaint.routing_system.applicant.domain.UrgencyLevel;
import com.smart.complaint.routing_system.applicant.dto.ComplaintResponse;
import com.smart.complaint.routing_system.applicant.dto.ComplaintSearchCondition;
import com.smart.complaint.routing_system.applicant.dto.ComplaintSearchResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.stream.Collectors;
import static com.smart.complaint.routing_system.applicant.entity.QComplaint.complaint;
import com.smart.complaint.routing_system.applicant.entity.QComplaintNormalization; // 팀원의 Q클래스

@Repository
@RequiredArgsConstructor
public class ComplaintRepositoryImpl implements ComplaintRepositoryCustom {

    private final JPAQueryFactory queryFactory;
    private final QComplaintNormalization normalization = QComplaintNormalization.complaintNormalization;

    @Override
    public List<ComplaintResponse> search(Long departmentId, ComplaintSearchCondition condition) {

        var results = queryFactory
                .selectFrom(complaint)
                .where(
                        // 1. 내 부서 ID와 일치하는 것만 (필수 보안)
                        complaint.currentDepartmentId.eq(departmentId),

                        // 2. 검색 필터들
                        keywordContains(condition.getKeyword()),
                        statusEq(condition.getStatus()),
                        urgencyEq(condition.getUrgency()),
                        hasIncident(condition.getHasIncident())
                )
                .orderBy(getOrderSpecifier(condition.getSort())) // 정렬 적용
                .fetch();

        return results.stream()
                .map(ComplaintResponse::new)
                .collect(Collectors.toList());
    }

    @Override
    public List<ComplaintSearchResult> findSimilarComplaint(double[] queryEmbedding, int limit) {
        String vectorString = java.util.Arrays.toString(queryEmbedding);

        // PGVector 코사인 거리 계산 (1 - Cosine Distance)
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

    // --- 조건 메서드 ---
    private BooleanExpression keywordContains(String keyword) {
        if (keyword == null || keyword.isEmpty()) return null;
        return complaint.title.contains(keyword)
                .or(complaint.body.contains(keyword));
    }

    private BooleanExpression statusEq(ComplaintStatus status) {
        return status != null ? complaint.status.eq(status) : null;
    }

    private BooleanExpression urgencyEq(UrgencyLevel urgency) {
        return urgency != null ? complaint.urgency.eq(urgency) : null;
    }

    private BooleanExpression hasIncident(Boolean hasIncident) {
        if (hasIncident == null) return null;
        return hasIncident ? complaint.incidentId.isNotNull() : complaint.incidentId.isNull();
    }

    // --- 정렬 메서드 (Sort) ---
    private OrderSpecifier<?> getOrderSpecifier(String sort) {
        if ("urgency".equals(sort)) {
            // 긴급도: HIGH(2) -> MEDIUM(1) -> LOW(0) 순서라고 가정 (Enum 정의 순서에 따라 다름)
            // 보통 Enum을 HIGH, MEDIUM, LOW 순으로 정의했으면 ordinal() 기준 asc()가 맞을 수 있음
            // 여기서는 안전하게 문자열 기준 desc로 잡거나, Enum 순서 확인 필요.
            // 일단 urgency 필드 자체 정렬
            return complaint.urgency.desc();
        } else if ("status".equals(sort)) {
            return complaint.status.asc();
        }
        // 기본값: 최신순
        return complaint.receivedAt.desc();
    }
}