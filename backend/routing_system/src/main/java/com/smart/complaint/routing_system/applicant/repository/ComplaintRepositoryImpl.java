package com.smart.complaint.routing_system.applicant.repository;

import com.querydsl.core.Tuple;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.core.types.dsl.NumberTemplate;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.smart.complaint.routing_system.applicant.domain.ComplaintStatus;
import com.smart.complaint.routing_system.applicant.domain.UrgencyLevel;
import com.smart.complaint.routing_system.applicant.dto.ComplaintDetailResponse;
import com.smart.complaint.routing_system.applicant.dto.ComplaintResponse;
import com.smart.complaint.routing_system.applicant.dto.ComplaintSearchCondition;
import com.smart.complaint.routing_system.applicant.dto.ComplaintSearchResult;
import com.smart.complaint.routing_system.applicant.dto.ComplaintDetailDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintHeatMap;
import com.smart.complaint.routing_system.applicant.dto.ComplaintResponse;
import com.smart.complaint.routing_system.applicant.dto.ComplaintSearchCondition;
import com.smart.complaint.routing_system.applicant.dto.ComplaintSearchResult;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.stream.Collectors;

import static com.smart.complaint.routing_system.applicant.entity.QComplaint.complaint;

// 팀원의 Q클래스
import com.smart.complaint.routing_system.applicant.entity.*;

import org.springframework.util.StringUtils;

@Repository
@RequiredArgsConstructor
public class ComplaintRepositoryImpl implements ComplaintRepositoryCustom {

        private static final Logger log = LoggerFactory.getLogger(ComplaintRepositoryImpl.class);
        private final JPAQueryFactory queryFactory;
        private final QComplaintNormalization normalization = QComplaintNormalization.complaintNormalization;
        private final QUser user = QUser.user;

        @Override
        public Page<ComplaintResponse> search(Long departmentId, ComplaintSearchCondition condition) {
                List<Tuple> results = queryFactory
                                .select(complaint, normalization.neutralSummary, user.displayName)
                                .from(complaint)
                                .leftJoin(normalization).on(normalization.complaint.eq(complaint))
                                .leftJoin(user).on(complaint.answeredBy.eq(user.id))
                                .where(
                                                complaint.currentDepartmentId.eq(departmentId),
                                                keywordContains(condition.getKeyword()),
                                                statusEq(condition.getStatus()),
                                                hasIncident(condition.getHasIncident()),
                                                hasTags(condition.getHasTags())
                                )
                                .orderBy(getOrderSpecifier(condition.getSort())) // 정렬 적용
                                .offset(condition.getOffset()) // 건너뛰기
                                .limit(condition.getSize())    //  10개만 가져오기
                                .fetch();
                List<ComplaintResponse> content = results.stream()
                        .map(tuple -> {
                                Complaint c = tuple.get(complaint);
                                String summary = tuple.get(normalization.neutralSummary);
                                String managerName = tuple.get(user.displayName);

                                ComplaintResponse dto = new ComplaintResponse(c);
                                dto.setNeutralSummary(summary);
                                dto.setManagerName(managerName);
                                return dto;
                        })
                        .filter(java.util.Objects::nonNull)
                        .collect(Collectors.toList());

                Long total = queryFactory
                        .select(complaint.count())
                        .from(complaint)
                        .leftJoin(normalization).on(normalization.complaint.eq(complaint)) // 검색 조건에 normalization 포함시 필요
                        .where(
                                complaint.currentDepartmentId.eq(departmentId),
                                keywordContains(condition.getKeyword()),
                                statusEq(condition.getStatus()),
                                hasIncident(condition.getHasIncident()),
                                hasTags(condition.getHasTags())
                        )
                        .fetchOne();

                if (total == null) total = 0L;

                // 3. Page 객체 반환
                return new PageImpl<>(content, PageRequest.of(condition.getPage() - 1, condition.getSize()), total);
        }

        // [하단 조건 메서드 추가]
        private BooleanExpression hasTags(Boolean hasTags) {
                return (hasTags != null && hasTags) ? complaint.tag.isNotNull() : null;
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
                                                similarity.as("score")))
                                .from(normalization)
                                .join(normalization.complaint, complaint)
                                .where(normalization.isCurrent.isTrue())
                                .orderBy(similarity.desc())
                                .limit(limit)
                                .fetch();
        }

        @Override
        public List<ComplaintDto> findTop3RecentComplaintByApplicantId(Long applicantId) {
                QComplaint complaint = QComplaint.complaint;

                return queryFactory
                                .select(Projections.constructor(ComplaintDto.class,
                                                complaint.id,
                                                complaint.title,
                                                complaint.status, // 엔티티의 Enum 타입
                                                complaint.createdAt // 엔티티의 LocalDateTime 타입
                                ))
                                .from(complaint)
                                .where(complaint.applicantId.eq(applicantId))
                                .orderBy(complaint.createdAt.desc())
                                .limit(3)
                                .fetch();
        }

        @Override
        public List<ComplaintDetailDto> findAllByApplicantId(Long applicantId, String keyword) {
                QComplaint complaint = QComplaint.complaint;

                return queryFactory
                                .select(Projections.constructor(ComplaintDetailDto.class,
                                                complaint.id,
                                                complaint.title,
                                                complaint.body,
                                                complaint.answer,
                                                complaint.addressText,
                                                complaint.status, // Enum 타입 (예: RECEIVED)
                                                complaint.createdAt, // LocalDateTime 타입
                                                complaint.updatedAt))
                                .from(complaint)
                                .where(
                                                complaint.applicantId.eq(applicantId),
                                                titleContains(keyword))
                                .orderBy(complaint.createdAt.desc())
                                .fetch();
        }

        // --- 조건 메서드 ---
        private BooleanExpression keywordContains(String keyword) {
                if (keyword == null || keyword.isEmpty())
                        return null;
                return complaint.title.contains(keyword)
                                .or(complaint.body.contains(keyword));
        }

        private BooleanExpression statusEq(ComplaintStatus status) {
                return status != null ? complaint.status.eq(status) : null;
        }

        private BooleanExpression hasIncident(Boolean hasIncident) {
                if (hasIncident == null)
                        return null;
                return hasIncident ? complaint.incident.isNotNull() : complaint.incident.isNull();
        }

        private BooleanExpression titleContains(String keyword) {
                // 검색어가 없으면(null 또는 빈 문자열) null을 반환 -> where 절에서 무시됨
                return StringUtils.hasText(keyword) ? QComplaint.complaint.title.contains(keyword) : null;
        }

        private OrderSpecifier<?> getOrderSpecifier(String sort) {
                if ("status".equals(sort)) {
                        return complaint.status.asc();
                }
                // 기본값: 최신순
                return complaint.receivedAt.desc();
        }

        @Override
        public ComplaintDetailResponse getComplaintDetail(Long complaintId) {
                QComplaint complaint = QComplaint.complaint;
                QComplaintNormalization normalization = QComplaintNormalization.complaintNormalization;
                QIncident incident = QIncident.incident;
                QDepartment department = QDepartment.department;

                // [수정] 자식 민원까지 Fetch Join하여 조회
                // QueryDSL에서 OneToMany fetch join은 데이터 뻥튀기 주의가 필요하지만,
                // 여기서는 단건 조회(where id eq)이므로 distinct()를 사용하여 깔끔하게 가져옵니다.

                // 1. 사건에 묶인 민원 수 계산 (SubQuery)
                var incidentCountSubQuery = JPAExpressions
                                .select(complaint.count())
                                .from(complaint)
                                .where(complaint.incident.id.eq(incident.id));

                // 2. 조인 쿼리 실행
                Complaint c = queryFactory
                                .select(complaint)
                                .from(complaint)
                                .leftJoin(complaint.childComplaints).fetchJoin() // [신규] 자식들까지 한방에
                                .leftJoin(complaint.incident, incident).fetchJoin()
                                .where(complaint.id.eq(complaintId))
                                .fetchOne(); // 여기서 distinct는 Entity Graph상 자동 처리될 수 있으나 필요시 .distinct()

                if (c == null) {
                        return null;
                }

                // 3. 연관 데이터 별도 조회 (Normalization, Department, User)
                // Entity 조회 후 DTO 변환 시점에 필요한 데이터들

                ComplaintNormalization n = null;

                Tuple normTuple = queryFactory
                                .select(
                                                normalization.neutralSummary,
                                                normalization.coreRequest,
                                                normalization.coreCause,
                                                normalization.targetObject,
                                                normalization.locationHint,
                                                normalization.keywordsJsonb // JSONB는 드라이버가 지원하면 가져옴
                                )
                                .from(normalization)
                                .where(normalization.complaint.eq(c))
                                .fetchFirst();

                if (normTuple != null) {
                        // Builder를 사용해 필요한 값만 채운 임시 객체 생성 (embedding은 null 상태)
                        n = ComplaintNormalization.builder()
                                        .neutralSummary(normTuple.get(normalization.neutralSummary))
                                        .coreRequest(normTuple.get(normalization.coreRequest))
                                        .coreCause(normTuple.get(normalization.coreCause))
                                        .targetObject(normTuple.get(normalization.targetObject))
                                        .locationHint(normTuple.get(normalization.locationHint))
                                        .keywordsJsonb(normTuple.get(normalization.keywordsJsonb))
                                        .build();
                }

                // 부서명
                String deptName = null;
                if (c.getCurrentDepartmentId() != null) {
                        deptName = queryFactory
                                        .select(department.name)
                                        .from(department)
                                        .where(department.id.eq(c.getCurrentDepartmentId()))
                                        .fetchOne();
                }

                // 담당자 이름
                String mgrName = null;
                if (c.getAnsweredBy() != null) {
                        mgrName = queryFactory
                                        .select(user.displayName)
                                        .from(user)
                                        .where(user.id.eq(c.getAnsweredBy()))
                                        .fetchOne();
                }

                // 사건 카운트
                Long iCount = 0L;
                if (c.getIncident() != null) {
                        iCount = queryFactory
                                        .select(complaint.count())
                                        .from(complaint)
                                        .where(complaint.incident.eq(c.getIncident()))
                                        .fetchOne();
                }

                ComplaintDetailResponse res = new ComplaintDetailResponse(c, n, c.getIncident(), iCount, deptName);
                res.setManagerName(mgrName);
                return res;
        }

        @Override
        public List<ComplaintHeatMap> getAllComplaintsWithLatLon(Long applicantId) {
                QComplaint complaint = QComplaint.complaint;

                return queryFactory
                                .select(Projections.constructor(ComplaintHeatMap.class,
                                                complaint.id,
                                                complaint.lat,
                                                complaint.lon))
                                .from(complaint)
                                .where(
                                                complaint.applicantId.eq(applicantId))
                                .fetch();
        }
}