package com.smart.complaint.routing_system.applicant.service;

import java.util.List;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import com.smart.complaint.routing_system.applicant.dto.ComplaintDto;

// 민원인 서비스
@Service
@RequiredArgsConstructor
public class ApplicantService {

    public List<ComplaintDto> getAllComplaints(String applicantId) {

        return null;
    }
}
