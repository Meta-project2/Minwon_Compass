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
import com.smart.complaint.routing_system.applicant.dto.ComplaintStatDto;
import com.smart.complaint.routing_system.applicant.dto.KeywordsDto;
import com.smart.complaint.routing_system.applicant.dto.ChildComplaintDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintDetailDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintHeatMap;
import com.smart.complaint.routing_system.applicant.dto.AdminDashboardStatsDto.*;
import com.smart.complaint.routing_system.applicant.dto.CategoryAvgDto;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.smart.complaint.routing_system.applicant.dto.ComplaintListDto;

import jakarta.persistence.Query;
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
import com.smart.complaint.routing_system.applicant.entity.*;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.springframework.util.StringUtils;

@Repository
@RequiredArgsConstructor
public class ComplaintRepositoryImpl implements ComplaintRepositoryCustom {

        private static final Logger log = LoggerFactory.getLogger(ComplaintRepositoryImpl.class);
        private final JPAQueryFactory queryFactory;
        private final QComplaintNormalization normalization = QComplaintNormalization.complaintNormalization;
        private final QDepartment department = QDepartment.department;
        private final QUser user = QUser.user;

        @Override
        public Page<ComplaintResponse> search(Long departmentId, ComplaintSearchCondition condition) {
                List<Tuple> results = queryFactory
                                .select(complaint, normalization.neutralSummary, normalization.coreRequest,
                                                user.displayName)
                                .from(complaint)
                                .leftJoin(normalization).on(normalization.complaint.eq(complaint))
                                .leftJoin(user).on(complaint.answeredBy.eq(user.id))
                                .where(
                                                complaint.currentDepartmentId.eq(departmentId),
                                                keywordContains(condition.getKeyword()),
                                                statusEq(condition.getStatus()),
                                                hasIncident(condition.getHasIncident()))
                                .orderBy(getOrderSpecifier(condition.getSort()))
                                .offset(condition.getOffset())
                                .limit(condition.getSize())
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
                                .leftJoin(normalization).on(normalization.complaint.eq(complaint))
                                .where(
                                                complaint.currentDepartmentId.eq(departmentId),
                                                keywordContains(condition.getKeyword()),
                                                statusEq(condition.getStatus()),
                                                hasIncident(condition.getHasIncident()))
                                .fetchOne();

                if (total == null)
                        total = 0L;

                // 3. Page 객체 반환
                return new PageImpl<>(content, PageRequest.of(condition.getPage() - 1, condition.getSize()), total);
        }

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
                                                complaint.status,
                                                complaint.createdAt))
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
                                                complaint.status,
                                                complaint.createdAt,
                                                complaint.updatedAt,
                                                department.name))
                                .from(complaint)
                                .leftJoin(department).on(complaint.currentDepartmentId.eq(department.id))
                                .where(
                                                complaint.applicantId.eq(applicantId),
                                                titleContains(keyword))
                                .orderBy(complaint.createdAt.desc())
                                .fetch();
        }

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
                return StringUtils.hasText(keyword) ? QComplaint.complaint.title.contains(keyword) : null;
        }

        private BooleanExpression applicantIdEq(Long applicantId) {
                return applicantId != null ? QComplaint.complaint.applicantId.eq(applicantId) : null;
        }

        private OrderSpecifier<?> getOrderSpecifier(String sort) {
                if ("status".equals(sort)) {
                        return complaint.status.asc();
                }
                return complaint.receivedAt.desc();
        }

        @Override
        public ComplaintDetailResponse getComplaintDetail(Long complaintId) {
                QComplaint complaint = QComplaint.complaint;
                QComplaintNormalization normalization = QComplaintNormalization.complaintNormalization;
                QIncident incident = QIncident.incident;
                QDepartment department = QDepartment.department;

                var incidentCountSubQuery = JPAExpressions
                                .select(complaint.count())
                                .from(complaint)
                                .where(complaint.incident.id.eq(incident.id));
                Complaint c = queryFactory
                                .select(complaint)
                                .from(complaint)
                                .leftJoin(complaint.childComplaints).fetchJoin()
                                .leftJoin(complaint.incident, incident).fetchJoin()
                                .where(complaint.id.eq(complaintId))
                                .fetchOne();

                if (c == null) {
                        return null;
                }
                ComplaintNormalization n = null;

                Tuple normTuple = queryFactory
                                .select(
                                                normalization.neutralSummary,
                                                normalization.coreRequest,
                                                normalization.coreCause,
                                                normalization.targetObject,
                                                normalization.locationHint,
                                                normalization.keywordsJsonb)
                                .from(normalization)
                                .where(normalization.complaint.eq(c))
                                .fetchFirst();

                if (normTuple != null) {
                        n = ComplaintNormalization.builder()
                                        .neutralSummary(normTuple.get(normalization.neutralSummary))
                                        .coreRequest(normTuple.get(normalization.coreRequest))
                                        .coreCause(normTuple.get(normalization.coreCause))
                                        .targetObject(normTuple.get(normalization.targetObject))
                                        .locationHint(normTuple.get(normalization.locationHint))
                                        .keywordsJsonb(normTuple.get(normalization.keywordsJsonb))
                                        .build();
                }

                String deptName = null;
                if (c.getCurrentDepartmentId() != null) {
                        deptName = queryFactory
                                        .select(department.name)
                                        .from(department)
                                        .where(department.id.eq(c.getCurrentDepartmentId()))
                                        .fetchOne();
                }
                String mgrName = null;
                if (c.getAnsweredBy() != null) {
                        mgrName = queryFactory
                                        .select(user.displayName)
                                        .from(user)
                                        .where(user.id.eq(c.getAnsweredBy()))
                                        .fetchOne();
                }
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
                                .orderBy(childComplaint.createdAt.asc())
                                .fetch();
        }

        @Override
        public List<DailyCountDto> getDailyTrends(LocalDateTime start, LocalDateTime end, Long deptId) {
                var dateTemplate = Expressions.stringTemplate("TO_CHAR({0}, 'MM/DD')", complaint.receivedAt);
                QDepartment dept = QDepartment.department;

                return queryFactory
                                .select(Projections.constructor(DailyCountDto.class,
                                                dateTemplate,
                                                complaint.count()))
                                .from(complaint)
                                .leftJoin(dept).on(complaint.currentDepartmentId.eq(dept.id))
                                .where(complaint.receivedAt.between(start, end)
                                                .and(deptIdEq(deptId, dept)))
                                .groupBy(dateTemplate)
                                .orderBy(dateTemplate.asc())
                                .fetch();
        }

        @Override
        public List<TimeRangeDto> getProcessingTimeStats(LocalDateTime start, LocalDateTime end, Long deptId) {
                QDepartment dept = QDepartment.department;
                List<Tuple> results = queryFactory
                                .select(complaint.receivedAt, complaint.closedAt)
                                .from(complaint)
                                .leftJoin(dept).on(complaint.currentDepartmentId.eq(dept.id))
                                .where(complaint.receivedAt.between(start, end)
                                                .and(complaint.status.in(ComplaintStatus.RESOLVED,
                                                                ComplaintStatus.CLOSED))
                                                .and(complaint.closedAt.isNotNull())
                                                .and(deptIdEq(deptId, dept)))
                                .fetch();

                Map<String, Long> countMap = new HashMap<>();
                String[] ranges = { "3일 이내", "7일 이내", "14일 이내", "14일 이상" };
                for (String r : ranges)
                        countMap.put(r, 0L);

                for (Tuple t : results) {
                        LocalDateTime received = t.get(complaint.receivedAt);
                        LocalDateTime closed = t.get(complaint.closedAt);
                        if (received != null && closed != null) {
                                long days = java.time.Duration.between(received, closed).toDays();
                                String label;
                                if (days <= 3)
                                        label = "3일 이내";
                                else if (days <= 7)
                                        label = "7일 이내";
                                else if (days <= 14)
                                        label = "14일 이내";
                                else
                                        label = "14일 이상";
                                countMap.put(label, countMap.get(label) + 1);
                        }
                }

                List<TimeRangeDto> response = new ArrayList<>();
                for (String r : ranges)
                        response.add(new TimeRangeDto(r, countMap.get(r)));
                return response;
        }

        @Override
        public List<DeptStatusDto> getDeptStatusStats(LocalDateTime start, LocalDateTime end, Long deptId) {
                QDepartment d = QDepartment.department;
                QComplaint c = QComplaint.complaint;

                if (deptId == null) {
                        QDepartment subDept = new QDepartment("subDept");
                        return queryFactory
                                        .select(Projections.constructor(DeptStatusDto.class,
                                                        d.name,
                                                        c.count().coalesce(0L),
                                                        new CaseBuilder()
                                                                        .when(c.status.notIn(ComplaintStatus.RESOLVED,
                                                                                        ComplaintStatus.CLOSED))
                                                                        .then(1L).otherwise(0L)
                                                                        .sum().coalesce(0L)))
                                        .from(d)
                                        .leftJoin(subDept).on(subDept.parent.id.eq(d.id))
                                        .leftJoin(c).on(c.currentDepartmentId.eq(subDept.id)
                                                        .and(c.receivedAt.between(start, end)))
                                        .where(d.category.eq("GUK").and(d.isActive.isTrue()))
                                        .groupBy(d.id, d.name)
                                        .orderBy(c.count().desc())
                                        .fetch();
                } else {
                        return queryFactory
                                        .select(Projections.constructor(DeptStatusDto.class,
                                                        d.name,
                                                        c.count().coalesce(0L),
                                                        new CaseBuilder()
                                                                        .when(c.status.notIn(ComplaintStatus.RESOLVED,
                                                                                        ComplaintStatus.CLOSED))
                                                                        .then(1L).otherwise(0L)
                                                                        .sum().coalesce(0L)))
                                        .from(d)
                                        .leftJoin(c).on(c.currentDepartmentId.eq(d.id)
                                                        .and(c.receivedAt.between(start, end)))
                                        .where(d.parent.id.eq(deptId).and(d.isActive.isTrue()))
                                        .groupBy(d.id, d.name)
                                        .orderBy(c.count().desc())
                                        .fetch();
                }
        }

        private BooleanExpression deptIdEq(Long deptId, QDepartment dept) {
                if (deptId == null)
                        return null;
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

        @Override
        public List<RecurringIncidentDto> getTopRecurringIncidents(LocalDateTime currentStart, LocalDateTime currentEnd,
                        LocalDateTime prevStart, LocalDateTime prevEnd) {
                QIncident incident = QIncident.incident;

                // 기간 Top 3 사건 조회
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

                // 각 사건별 직전 기간 데이터 조회 및 증감 계산
                for (Tuple t : topIncidents) {
                        Long incId = t.get(incident.id);
                        String title = t.get(incident.title);
                        Long currentCount = t.get(complaint.count());

                        // 직전 기간 카운트
                        Long prevCount = queryFactory
                                        .select(complaint.count())
                                        .from(complaint)
                                        .where(complaint.incident.id.eq(incId)
                                                        .and(complaint.receivedAt.between(prevStart, prevEnd)))
                                        .fetchOne();

                        if (prevCount == null)
                                prevCount = 0L;

                        long trend = currentCount - prevCount;
                        String displayId = "I-2026-" + incId;

                        result.add(new RecurringIncidentDto(displayId, title, currentCount, trend));
                }

                return result;
        }

        @Override
        public Double getAiAccuracy(LocalDateTime start, LocalDateTime end) {
                Long total = queryFactory
                                .select(complaint.count())
                                .from(complaint)
                                .where(complaint.receivedAt.between(start, end)
                                                .and(complaint.aiPredictedDepartmentId.isNotNull()))
                                .fetchOne();

                if (total == null || total == 0)
                        return 0.0;

                Long matched = queryFactory
                                .select(complaint.count())
                                .from(complaint)
                                .where(complaint.receivedAt.between(start, end)
                                                .and(complaint.aiPredictedDepartmentId.isNotNull())
                                                .and(complaint.aiPredictedDepartmentId
                                                                .eq(complaint.currentDepartmentId)))
                                .fetchOne();

                if (matched == null)
                        matched = 0L;

                double accuracy = (double) matched / total * 100.0;
                return Math.round(accuracy * 10) / 10.0;
        }

        @Override
        public ComplaintStatDto geComplaintStatus() {

                LocalDateTime baseDate = queryFactory
                                .select(complaint.createdAt.max())
                                .from(complaint)
                                .where(complaint.createdAt.year().eq(2025))
                                .fetchOne();
                if (baseDate == null)
                        baseDate = LocalDateTime.of(2025, 12, 31, 23, 59);

                String sql = "SELECT " +
                                "  (SELECT ROUND(CAST(EXTRACT(EPOCH FROM AVG(updated_at - created_at)) / 86400 AS numeric), 1) FROM complaints) as total_avg, "
                                +
                                "  (SELECT cn.target_object FROM complaints c JOIN complaint_normalizations cn ON c.id = cn.complaint_id ORDER BY (c.updated_at - c.created_at) ASC LIMIT 1) as fastest_dept, "
                                +
                                "  (SELECT EXTRACT(EPOCH FROM AVG(updated_at - created_at)) FROM complaints WHERE created_at >= :currentStart AND created_at <= :currentEnd) as current_sec, "
                                +
                                "  (SELECT EXTRACT(EPOCH FROM AVG(updated_at - created_at)) FROM complaints WHERE created_at >= :prevStart AND created_at < :prevEnd) as prev_sec";

                Query nativeQuery = entityManager.createNativeQuery(sql);
                nativeQuery.setParameter("currentStart", baseDate.minusMonths(3));
                nativeQuery.setParameter("currentEnd", baseDate);
                nativeQuery.setParameter("prevStart", baseDate.minusMonths(6));
                nativeQuery.setParameter("prevEnd", baseDate.minusMonths(3));

                Object[] statsRow = (Object[]) nativeQuery.getSingleResult();

                double totalAvg = statsRow[0] != null ? ((Number) statsRow[0]).doubleValue() : 0.0;
                String fastestDept = statsRow[1] != null ? (String) statsRow[1] : "없음";
                Double currentSec = statsRow[2] != null ? ((Number) statsRow[2]).doubleValue() : null;
                Double prevSec = statsRow[3] != null ? ((Number) statsRow[3]).doubleValue() : null;

                double improvementRate = 0.0;
                if (prevSec != null && currentSec != null && prevSec > 0) {
                        improvementRate = Math.round(((prevSec - currentSec) / prevSec) * 1000) / 10.0;
                }
                String chartSql = "SELECT cn.target_object as category, ROUND(CAST(EXTRACT(EPOCH FROM AVG(c.updated_at - c.created_at)) / 86400 AS numeric), 1) as avgDays "
                                +
                                "FROM complaints c JOIN complaint_normalizations cn ON c.id = cn.complaint_id " +
                                "WHERE c.updated_at > c.created_at GROUP BY cn.target_object ORDER BY avgDays ASC LIMIT 5";

                List<Object[]> chartResults = entityManager.createNativeQuery(chartSql).getResultList();
                List<CategoryAvgDto> responseTimeData = chartResults.stream()
                                .map(row -> new CategoryAvgDto(((String) row[0]).replace("과", ""),
                                                ((Number) row[1]).doubleValue()))
                                .collect(Collectors.toList());

                return new ComplaintStatDto(totalAvg, responseTimeData, fastestDept, improvementRate);
        }

        @PersistenceContext
        private EntityManager entityManager;

        @Override
        public List<KeywordsDto> calculateKeywords() {
                String sql = "SELECT word as text, count(*) as value " +
                                "FROM complaint_normalizations, jsonb_array_elements_text(keywords_jsonb) as word " +
                                "GROUP BY word ORDER BY value DESC LIMIT 10";

                @SuppressWarnings("unchecked")
                List<Object[]> results = entityManager.createNativeQuery(sql).getResultList();

                log.info("쿼리 결과물: " + results.toString());
                return results.stream()
                                .map(row -> new KeywordsDto(
                                                (String) row[0],
                                                ((Number) row[1]).longValue()))
                                .collect(Collectors.toList());
        }

        @Override
        public ComplaintDetailDto findComplaintDetailById(Long id) {

                return queryFactory
                                .select(Projections.constructor(ComplaintDetailDto.class,
                                                complaint.id,
                                                complaint.title,
                                                complaint.body,
                                                complaint.answer,
                                                complaint.addressText,
                                                complaint.status,
                                                complaint.createdAt,
                                                complaint.updatedAt,
                                                department.name, // d.name 매핑
                                                Expressions.constant(new ArrayList<ChildComplaintDto>())))
                                .from(complaint)
                                .join(department).on(complaint.currentDepartmentId.eq(department.id))
                                .where(complaint.id.eq(id))
                                .fetchOne();
        }
}