package com.smart.complaint.routing_system.applicant.dto;

import lombok.Data;
import java.util.List;

@Data
public class IncidentMoveRequestDto {
    private Long targetIncidentId;
    private List<Long> complaintIds;
}