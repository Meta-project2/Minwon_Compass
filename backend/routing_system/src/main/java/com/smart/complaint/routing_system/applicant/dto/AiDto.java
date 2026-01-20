package com.smart.complaint.routing_system.applicant.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public class AiDto {

        public record Response(String status, String data, float[] embedding) {
        }

        public record Analysis(
                        List<Recommendation> recommendations,
                        @JsonProperty("original_analysis") OriginalAnalysis originalAnalysis) {
        }

        public record Recommendation(
                        int rank,
                        @JsonProperty("recommended_dept") String recommendedDept,
                        String reason,
                        @JsonProperty("related_case") String relatedCase,
                        double confidence) {
        }

        public record OriginalAnalysis(
                        String topic,
                        String keywords,
                        String category) {
        }

}