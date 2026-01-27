package com.smart.complaint.routing_system.applicant.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record NormalizationResponse(
                @JsonProperty("neutral_summary") String neutralSummary,
                @JsonProperty("core_request") String coreRequest,
                @JsonProperty("core_cause") String coreCause,
                @JsonProperty("target_object") List<String> targetObject,
                List<String> keywords,
                @JsonProperty("preprocess_body") String preprocessBody,
                double[] embedding) {
}
