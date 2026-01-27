package com.smart.complaint.routing_system.applicant.dto;

import java.math.BigDecimal;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ComplaintSubmitDto {
    private String title;
    private String body;
    private String addressText;
    private BigDecimal lat;
    private BigDecimal lon;
    private Long applicantId;
    private Long districtId;
}
