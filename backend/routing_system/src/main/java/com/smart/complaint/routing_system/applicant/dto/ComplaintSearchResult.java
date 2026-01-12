package com.smart.complaint.routing_system.applicant.dto;

public record ComplaintSearchResult(
        Long id,
        String title,
        String body,
        Double simScore
) {}
