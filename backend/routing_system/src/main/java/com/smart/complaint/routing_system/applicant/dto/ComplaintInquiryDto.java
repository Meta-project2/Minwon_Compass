package com.smart.complaint.routing_system.applicant.dto;

import jakarta.validation.constraints.NotBlank;

public record ComplaintInquiryDto(
        Long parentComplaintId,
        @NotBlank String title,
        @NotBlank String body) {
}
