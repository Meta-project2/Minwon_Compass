package com.smart.complaint.routing_system.applicant.dto;

import lombok.Builder;

@Builder
public record UserLoginRequest(String userId, String password, String displayName, String email) {
}
