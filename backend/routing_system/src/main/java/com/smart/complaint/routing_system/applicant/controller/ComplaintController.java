package com.smart.complaint.routing_system.applicant.controller;


import com.smart.complaint.routing_system.applicant.dto.ComplaintDetailResponse;
import com.smart.complaint.routing_system.applicant.dto.ComplaintResponse;
import com.smart.complaint.routing_system.applicant.dto.ComplaintSearchCondition;
import com.smart.complaint.routing_system.applicant.repository.ComplaintRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/agent/complaints")
@RequiredArgsConstructor
public class ComplaintController {

    private final ComplaintRepository complaintRepository;

    @GetMapping
    public List<ComplaintResponse> getComplaints(
            @ModelAttribute ComplaintSearchCondition condition
            // @AuthenticationPrincipal UserDetails userDetails
    ) {
        // [임시] 로그인한 사람이 '3번 부서' 소속이라고 가정
        // 나중에는 userDetails에서 진짜 부서 ID를 꺼내옵니다.
        Long myDepartmentId = 3L;

        return complaintRepository.search(myDepartmentId, condition);
    }

    @GetMapping("/{id}")
    public ComplaintDetailResponse getComplaintDetail(@PathVariable Long id) {
        return complaintRepository.getComplaintDetail(id);
    }
}