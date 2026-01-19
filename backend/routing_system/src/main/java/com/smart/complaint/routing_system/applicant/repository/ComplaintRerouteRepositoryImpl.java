package com.smart.complaint.routing_system.applicant.repository;

import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import com.smart.complaint.routing_system.applicant.dto.ComplaintRerouteResponse;
import com.smart.complaint.routing_system.applicant.dto.RerouteSearchCondition;
import com.smart.complaint.routing_system.applicant.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

import java.util.List;

import static com.smart.complaint.routing_system.applicant.entity.QComplaintReroute.complaintReroute;
import static com.smart.complaint.routing_system.applicant.entity.QComplaint.complaint;
import static com.smart.complaint.routing_system.applicant.entity.QComplaintNormalization.complaintNormalization;
import static com.smart.complaint.routing_system.applicant.entity.QDepartment.department;
import static com.smart.complaint.routing_system.applicant.entity.QUser.user;

@Repository
@RequiredArgsConstructor
public class ComplaintRerouteRepositoryImpl implements ComplaintRerouteRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<ComplaintRerouteResponse> searchReroutes(RerouteSearchCondition condition) {

        // 부서 조인을 위해 별칭 사용
        QDepartment originDept = new QDepartment("originDept");
        QDepartment targetDept = new QDepartment("targetDept");

        List<ComplaintRerouteResponse> content = queryFactory
                .select(Projections.constructor(ComplaintRerouteResponse.class,
                        complaintReroute.id,
                        complaintReroute.createdAt,
                        complaint.id,
                        complaint.receivedAt, // 연도 포맷팅용
                        complaint.title,
                        complaint.addressText,
                        originDept.id,
                        originDept.name,
                        targetDept.id,
                        targetDept.name,
                        user.displayName,
                        complaintReroute.requestReason,
                        complaintReroute.status,
                        complaintNormalization.routingRank,
                        complaintNormalization.targetObject
                ))
                .from(complaintReroute)
                .join(complaintReroute.complaint, complaint)
                .leftJoin(complaintNormalization).on(complaintNormalization.complaint.eq(complaint))
                .join(originDept).on(complaintReroute.originDepartmentId.eq(originDept.id))
                .join(targetDept).on(complaintReroute.targetDepartmentId.eq(targetDept.id))
                .leftJoin(user).on(complaintReroute.requesterId.eq(user.id))
                .where(
                        statusEq(condition.getStatus()),
                        keywordContains(condition.getKeyword()), // ★ 검색 로직 수정됨
                        originDeptEq(condition.getOriginDeptId()), // ★ 부서 필터 분리
                        targetDeptEq(condition.getTargetDeptId())  // ★ 부서 필터 분리
                )
                .orderBy(complaintReroute.createdAt.desc())
                .offset(condition.getOffset())
                .limit(condition.getSize())
                .fetch();

        Long total = queryFactory
                .select(complaintReroute.count())
                .from(complaintReroute)
                .join(complaintReroute.complaint, complaint)
                .leftJoin(user).on(complaintReroute.requesterId.eq(user.id))
                .where(
                        statusEq(condition.getStatus()),
                        keywordContains(condition.getKeyword()),
                        originDeptEq(condition.getOriginDeptId()),
                        targetDeptEq(condition.getTargetDeptId())
                )
                .fetchOne();

        if (total == null) total = 0L;

        return new PageImpl<>(content, PageRequest.of(condition.getPage() - 1, condition.getSize()), total);
    }

    // --- 조건식 ---

    private BooleanExpression statusEq(String status) {
        if (!StringUtils.hasText(status) || "all".equalsIgnoreCase(status)) return null;
        return complaintReroute.status.eq(status);
    }

    // 현재 부서 ID 필터
    private BooleanExpression originDeptEq(Long deptId) {
        if (deptId == null || deptId == 0) return null;
        return complaintReroute.originDepartmentId.eq(deptId);
    }

    // 희망 부서 ID 필터
    private BooleanExpression targetDeptEq(Long deptId) {
        if (deptId == null || deptId == 0) return null;
        return complaintReroute.targetDepartmentId.eq(deptId);
    }

    // ★ 검색: 제목 OR 요청자 OR ID(숫자)
    private BooleanExpression keywordContains(String keyword) {
        if (!StringUtils.hasText(keyword)) return null;

        // 1. 기본: 제목 or 요청자 이름
        BooleanExpression expr = complaint.title.contains(keyword)
                .or(user.displayName.contains(keyword));

        // 2. 숫자인 경우 ID 검색 추가 (예: "12" 입력 시 ID 12 검색)
        if (keyword.matches("\\d+")) {
            expr = expr.or(complaint.id.eq(Long.parseLong(keyword)));
        }
        return expr;
    }
}