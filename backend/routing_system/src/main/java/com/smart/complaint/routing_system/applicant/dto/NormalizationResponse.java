package com.smart.complaint.routing_system.applicant.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

// python에 민원 내용을 전송하고 받아오는 record
public record NormalizationResponse(
        @JsonProperty("neutral_summary")
        String neutralSummary,
        @JsonProperty("core_request")
        String coreRequest,
        @JsonProperty("core_cause")
        String coreCause,
        @JsonProperty("target_object")
        List<String> targetObject,
        List<String> keywords,
        @JsonProperty("preprocess_body")
        String preprocessBody,        // 전처리된 원본
        double[] embedding
) {}
