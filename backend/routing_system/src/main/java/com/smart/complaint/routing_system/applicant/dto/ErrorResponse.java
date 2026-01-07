package com.smart.complaint.routing_system.applicant.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ErrorResponse {

    private int status;
    private String message;
    
}
