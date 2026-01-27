package com.smart.complaint.routing_system.applicant.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class ComplaintAnswerRequest {
    private String answer;

    @JsonProperty("isTemporary")
    private boolean isTemporary;
}