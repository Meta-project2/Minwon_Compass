package com.smart.complaint.routing_system.applicant.dto;

import jakarta.validation.Valid;

@Valid
public record UserCheckDto(
    String checkString,
    String type) {
}
