package com.smart.complaint.routing_system.applicant.controller;

import com.smart.complaint.routing_system.applicant.dto.ComplaintDto;
import com.smart.complaint.routing_system.applicant.service.ApplicantService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

// 민원인 컨트롤러
@RestController
@RequiredArgsConstructor
public class ApplicantController {

    private static ApplicantService applicantService;

    @GetMapping("/api/home")
    public ResponseEntity<?> login(@AuthenticationPrincipal OAuth2User principal) {
        if(principal == null) {
            return null;
        }

        // 로그인한 사용자의 정보를 담아서 전송
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", principal.getAttribute("id"));
        userInfo.put("name", principal.getName());

        // TODO: 확인용, 이후 변경할 것
        return ResponseEntity.ok(userInfo);
    }

    @GetMapping("/api/complaints")
    public ResponseEntity<List<ComplaintDto>> getAllComplaints(@AuthenticationPrincipal String applicantId) {
        
        // 현재 로그인한 사용자의 모든 민원 조회
        List<ComplaintDto> complaints = applicantService.getAllComplaints(applicantId);

        return ResponseEntity.ok(complaints);
    }
}
