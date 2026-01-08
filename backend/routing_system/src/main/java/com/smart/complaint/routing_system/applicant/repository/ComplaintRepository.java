package com.smart.complaint.routing_system.applicant.repository;

import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.core.types.dsl.NumberTemplate;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.smart.complaint.routing_system.applicant.dto.ComplaintSearchResult;
import com.smart.complaint.routing_system.applicant.entity.QComplaint;
import com.smart.complaint.routing_system.applicant.entity.QComplaintNormalization;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class ComplaintRepository {

    private final JPAQueryFactory queryFactory;
    private final QComplaintNormalization normalization = QComplaintNormalization.complaintNormalization;
    private final QComplaint complaint = QComplaint.complaint;

    public List<ComplaintSearchResult> findSimilarComplaint(double[] queryEmbedding, int limit) {

        // double 형태의 임베딩 데이터를 스트링으로 변환 -> postgresql이 인식할 수 있도록
        String vectorString = java.util.Arrays.toString(queryEmbedding);

        // 코사인 유사도 계산 템플릿 (1 - Cosine Distance)
        // {0}은 엔티티의 필드, {1}은 변환된 벡터 문자열
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
                .orderBy(similarity.desc()) // 유사도 높은 순
                .limit(limit)
                .fetch();
    }

}
