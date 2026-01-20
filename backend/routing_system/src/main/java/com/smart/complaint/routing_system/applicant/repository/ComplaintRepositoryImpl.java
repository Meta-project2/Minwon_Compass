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
import com.smart.complaint.routing_system.applicant.dto.ComplaintDetailResponse;
import com.smart.complaint.routing_system.applicant.dto.ComplaintResponse;
import com.smart.complaint.routing_system.applicant.dto.ComplaintSearchCondition;
import com.smart.complaint.routing_system.applicant.dto.ComplaintSearchResult;
import com.smart.complaint.routing_system.applicant.dto.ChildComplaintDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintDetailDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintHeatMap;
import com.smart.complaint.routing_system.applicant.dto.ComplaintResponse;
import com.smart.complaint.routing_system.applicant.dto.ComplaintSearchCondition;
import com.smart.complaint.routing_system.applicant.dto.ComplaintSearchResult;
import com.smart.complaint.routing_system.applicant.dto.AdminDashboardStatsDto.*;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.core.types.dsl.NumberExpression;
import com.smart.complaint.routing_system.applicant.dto.ComplaintListDto;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
                                .select(complaint, normalization.neutralSummary,normalization.coreRequest, user.displayName)
                                .from(complaint)
                                .leftJoin(normalization).on(normalization.complaint.eq(complaint))
                                .leftJoin(user).on(complaint.answeredBy.eq(user.id))
                                .where(
                                                complaint.currentDepartmentId.eq(departmentId),
                                                keywordContains(condition.getKeyword()),
                                                statusEq(condition.getStatus()),
                                                hasIncident(condition.getHasIncident())
//                                                hasTags(condition.getHasTags())
                                )
                                .orderBy(getOrderSpecifier(condition.getSort())) // 정렬 적용
                                .offset(condition.getOffset()) // 건너뛰기
                                .limit(condition.getSize()) // 10개만 가져오기
                                .fetch();
                List<ComplaintResponse> content = results.stream()
                                .map(tuple -> {
                                        Complaint c = tuple.get(complaint);
                                        String summary = tuple.get(normalization.neutralSummary);
                                        String coreRequest = tuple.get(normalization.coreRequest);
                                        String managerName = tuple.get(user.displayName);

                                        ComplaintResponse dto = new ComplaintResponse(c);
                                        dto.setNeutralSummary(summary);
                                        dto.setManagerName(managerName);
                                        dto.setCoreRequest(coreRequest);
                                        return dto;
                                })
                                .filter(java.util.Objects::nonNull)
                                .collect(Collectors.toList());

                Long total = queryFactory
                                .select(complaint.count())
                                .from(complaint)
                                .leftJoin(normalization).on(normalization.complaint.eq(complaint)) // 검색 조건에
                                                                                                   // normalization 포함시
                                                                                                   // 필요
                                .where(
                                                complaint.currentDepartmentId.eq(departmentId),
                                                keywordContains(condition.getKeyword()),
                                                statusEq(condition.getStatus()),
                                                hasIncident(condition.getHasIncident())
//                                                hasTags(condition.getHasTags())
                                )
                                .fetchOne();

                if (total == null)
                        total = 0L;

                // 3. Page 객체 반환
                return new PageImpl<>(content, PageRequest.of(condition.getPage() - 1, condition.getSize()), total);
        }

        /* 수정 전
        private BooleanExpression hasTagsEq(Boolean hasTags) {
            return (hasTags != null && hasTags) ? complaint.tag.isNotNull() : null;
        }
        */

        // 수정 후: 기능을 아예 비활성화하거나 null을 반환하게 합니다.
        private BooleanExpression hasTagsEq(Boolean hasTags) {
                return null;
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
                                .where(applicantIdEq(applicantId))
                                .orderBy(complaint.createdAt.desc())
                                .limit(3)
                                .fetch();
        }

        @Override
        public List<ComplaintListDto> findAllByApplicantId(Long applicantId, String keyword) {
                QComplaint complaint = QComplaint.complaint;

                return queryFactory
                                .select(Projections.constructor(ComplaintListDto.class,
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

        private BooleanExpression applicantIdEq(Long applicantId) {
                // applicantId가 null이면 null을 반환하여 where 절에서 조건이 제외되게 함
                return applicantId != null ? QComplaint.complaint.applicantId.eq(applicantId) : null;
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
        public List<ComplaintHeatMap> getAllComplaintsWithLatLon() {
                QComplaint complaint = QComplaint.complaint;

                return queryFactory
                                .select(Projections.constructor(ComplaintHeatMap.class,
                                                complaint.id,
                                                complaint.title,
                                                complaint.status,
                                                complaint.createdAt,
                                                complaint.lat,
                                                complaint.lon))
                                .from(complaint)
                                .fetch();
        }

        @Override
        public List<ComplaintHeatMap> getAllComplaintsWithLatLon(Long id) {
                return List.of();
        }

        @Override
        public List<ChildComplaintDto> findChildComplaintsByParentId(Long parentId) {
                QChildComplaint childComplaint = QChildComplaint.childComplaint;
                return queryFactory
                                .select(Projections.constructor(ChildComplaintDto.class,
                                                childComplaint.id,
                                                childComplaint.title,
                                                childComplaint.body,
                                                childComplaint.answer,
                                                childComplaint.status,
                                                childComplaint.createdAt,
                                                childComplaint.updatedAt))
                                .from(childComplaint)
                                .where(childComplaint.parentComplaint.id.eq(parentId))
                                .orderBy(childComplaint.createdAt.asc()) // 시간순 정렬 (타임라인용)
                                .fetch();
        }

        // 1. 민원 접수 추이 (일별 Grouping)
        @Override
        public List<DailyCountDto> getDailyTrends(LocalDateTime start, LocalDateTime end, Long deptId) {
                var dateTemplate = Expressions.stringTemplate("TO_CHAR({0}, 'MM/DD')", complaint.receivedAt);
                QDepartment dept = QDepartment.department;

                return queryFactory
                        .select(Projections.constructor(DailyCountDto.class,
                                dateTemplate,
                                complaint.count()))
                        .from(complaint)
                        .leftJoin(dept).on(complaint.currentDepartmentId.eq(dept.id)) // 부서 조인
                        .where(complaint.receivedAt.between(start, end)
                                .and(deptIdEq(deptId, dept))) // 부서 필터 조건
                        .groupBy(dateTemplate)
                        .orderBy(dateTemplate.asc())
                        .fetch();
        }

        @Override
        public List<TimeRangeDto> getProcessingTimeStats(LocalDateTime start, LocalDateTime end, Long deptId) {
                QDepartment dept = QDepartment.department;

                // DB 조회
                List<Tuple> results = queryFactory
                        .select(complaint.receivedAt, complaint.closedAt)
                        .from(complaint)
                        .leftJoin(dept).on(complaint.currentDepartmentId.eq(dept.id))
                        .where(complaint.receivedAt.between(start, end)
                                .and(complaint.status.in(ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED))
                                .and(complaint.closedAt.isNotNull())
                                .and(deptIdEq(deptId, dept))) // 부서 필터
                        .fetch();

                // Java 집계 로직 (기존과 동일)
                Map<String, Long> countMap = new HashMap<>();
                String[] ranges = {"3일 이내", "7일 이내", "14일 이내", "14일 이상"};
                for (String r : ranges) countMap.put(r, 0L);

                for (Tuple t : results) {
                        LocalDateTime received = t.get(complaint.receivedAt);
                        LocalDateTime closed = t.get(complaint.closedAt);
                        if (received != null && closed != null) {
                                long days = java.time.Duration.between(received, closed).toDays();
                                String label;
                                if (days <= 3) label = "3일 이내";
                                else if (days <= 7) label = "7일 이내";
                                else if (days <= 14) label = "14일 이내";
                                else label = "14일 이상";
                                countMap.put(label, countMap.get(label) + 1);
                        }
                }

                List<TimeRangeDto> response = new ArrayList<>();
                for (String r : ranges) response.add(new TimeRangeDto(r, countMap.get(r)));
                return response;
        }

        // 3. 부서별 현황 (핵심: 동적 그룹핑)
        @Override
        public List<DeptStatusDto> getDeptStatusStats(LocalDateTime start, LocalDateTime end, Long deptId) {
                QDepartment d = QDepartment.department;
                QComplaint c = QComplaint.complaint;

                if (deptId == null) {
                        // [전체 보기] 모든 '국(GUK)' 기준 (하위 과들의 민원 합산)
                        QDepartment subDept = new QDepartment("subDept");
                        return queryFactory
                                .select(Projections.constructor(DeptStatusDto.class,
                                        d.name,
                                        c.count().coalesce(0L), // 민원 없어도 0으로 표시
                                        new CaseBuilder()
                                                .when(c.status.notIn(ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED))
                                                .then(1L).otherwise(0L)
                                                .sum().coalesce(0L)
                                ))
                                .from(d)
                                .leftJoin(subDept).on(subDept.parent.id.eq(d.id)) // 국 하위의 과들 조인
                                .leftJoin(c).on(c.currentDepartmentId.eq(subDept.id)
                                        .and(c.receivedAt.between(start, end))) // 기간 내 민원 조인
                                .where(d.category.eq("GUK").and(d.isActive.isTrue()))
                                .groupBy(d.id, d.name)
                                .orderBy(c.count().desc())
                                .fetch();
                } else {
                        // [국 선택] 해당 국 하위의 모든 '과(GWA)' 리스트 (0건 포함)
                        return queryFactory
                                .select(Projections.constructor(DeptStatusDto.class,
                                        d.name,
                                        c.count().coalesce(0L),
                                        new CaseBuilder()
                                                .when(c.status.notIn(ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED))
                                                .then(1L).otherwise(0L)
                                                .sum().coalesce(0L)
                                ))
                                .from(d)
                                .leftJoin(c).on(c.currentDepartmentId.eq(d.id)
                                        .and(c.receivedAt.between(start, end)))
                                .where(d.parent.id.eq(deptId).and(d.isActive.isTrue()))
                                .groupBy(d.id, d.name)
                                .orderBy(c.count().desc())
                                .fetch();
                }
        }

        // [Helper] 부서 필터 조건 생성
        private BooleanExpression deptIdEq(Long deptId, QDepartment dept) {
                if (deptId == null) return null;
                // deptId가 들어오면, 해당 국(Parent)에 속한 부서인지 확인
                return dept.parent.id.eq(deptId);
        }

        @Override
        public List<CategoryStatDto> getCategoryStats(LocalDateTime start, LocalDateTime end) {
                return queryFactory
                        .select(Projections.constructor(CategoryStatDto.class,
                                normalization.targetObject.coalesce("기타"),
                                complaint.count()))
                        .from(normalization)
                        .join(normalization.complaint, complaint)
                        .where(complaint.receivedAt.between(start, end))
                        .groupBy(normalization.targetObject)
                        .orderBy(complaint.count().desc())
                        .fetch();
        }


        // 5. 반복 민원 Top 3 (증감 포함)
        @Override
        public List<RecurringIncidentDto> getTopRecurringIncidents(LocalDateTime currentStart, LocalDateTime currentEnd,
                                                                   LocalDateTime prevStart, LocalDateTime prevEnd) {
                QIncident incident = QIncident.incident;

                // 1단계: 이번 기간 Top 3 사건 조회
                List<Tuple> topIncidents = queryFactory
                        .select(incident.id, incident.title, complaint.count())
                        .from(complaint)
                        .join(complaint.incident, incident)
                        .where(complaint.receivedAt.between(currentStart, currentEnd))
                        .groupBy(incident.id, incident.title)
                        .orderBy(complaint.count().desc())
                        .limit(3)
                        .fetch();

                List<RecurringIncidentDto> result = new ArrayList<>();

                // 2단계: 각 사건별로 직전 기간 데이터 조회 및 증감 계산
                for (Tuple t : topIncidents) {
                        Long incId = t.get(incident.id);
                        String title = t.get(incident.title);
                        Long currentCount = t.get(complaint.count());

                        // 직전 기간 카운트 (별도 쿼리 - 3번만 실행되므로 성능 이슈 없음)
                        Long prevCount = queryFactory
                                .select(complaint.count())
                                .from(complaint)
                                .where(complaint.incident.id.eq(incId)
                                        .and(complaint.receivedAt.between(prevStart, prevEnd)))
                                .fetchOne();

                        if (prevCount == null) prevCount = 0L;

                        long trend = currentCount - prevCount;

                        // "I-PK" 형태로 ID 포맷팅
                        String displayId = "I-2026-" + incId;

                        result.add(new RecurringIncidentDto(displayId, title, currentCount, trend));
                }

                return result;
        }

        // 6. AI 자동 배정 품질
        @Override
        public Double getAiAccuracy(LocalDateTime start, LocalDateTime end) {
                // 전체 건수
                Long total = queryFactory
                        .select(complaint.count())
                        .from(complaint)
                        .where(complaint.receivedAt.between(start, end)
                                .and(complaint.aiPredictedDepartmentId.isNotNull())) // AI 예측값이 있는 것만 대상
                        .fetchOne();

                if (total == null || total == 0) return 0.0;

                // 일치 건수
                Long matched = queryFactory
                        .select(complaint.count())
                        .from(complaint)
                        .where(complaint.receivedAt.between(start, end)
                                .and(complaint.aiPredictedDepartmentId.isNotNull())
                                .and(complaint.aiPredictedDepartmentId.eq(complaint.currentDepartmentId)))
                        .fetchOne();

                if (matched == null) matched = 0L;

                // 백분율 계산 (소수점 첫째자리까지 반올림 로직은 Java에서 처리하거나 DB에서 처리)
                double accuracy = (double) matched / total * 100.0;
                return Math.round(accuracy * 10) / 10.0;
        }
}