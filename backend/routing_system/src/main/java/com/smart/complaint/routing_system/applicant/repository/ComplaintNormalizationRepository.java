package com.smart.complaint.routing_system.applicant.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.smart.complaint.routing_system.applicant.entity.ComplaintNormalization;

import jakarta.transaction.Transactional;

public interface ComplaintNormalizationRepository extends JpaRepository<ComplaintNormalization, Long> {

    @Modifying
    @Transactional
    @Query(value = "INSERT INTO complaint_normalizations " +
            "(complaint_id, resp_dept, neutral_summary, core_request, target_object, " +
            "keywords_jsonb, routing_rank, embedding, is_current, created_at) " +
            "VALUES (:complaintId, :respDept, :neutralSummary, :coreRequest, :targetObject, " +
            "CAST(:keywords AS jsonb), CAST(:routingRank AS jsonb), CAST(:embedding AS vector), " +
            ":isCurrent, CURRENT_TIMESTAMP)", nativeQuery = true)
    void insertNormalization(
            @Param("complaintId") Long complaintId,
            @Param("respDept") String respDept,
            @Param("neutralSummary") String neutralSummary,
            @Param("coreRequest") String coreRequest,
            @Param("targetObject") String targetObject,
            @Param("keywords") String keywords, // JSON 문자열
            @Param("routingRank") String routingRank, // JSON 문자열
            @Param("embedding") float[] embedding, // float 배열
            @Param("isCurrent") boolean isCurrent);

}
