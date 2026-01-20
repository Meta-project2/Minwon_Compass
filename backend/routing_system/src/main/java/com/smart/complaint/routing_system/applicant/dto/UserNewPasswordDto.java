package com.smart.complaint.routing_system.applicant.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

@Valid
public record UserNewPasswordDto(
        @NotBlank String id,
        @NotBlank String email) {

}
