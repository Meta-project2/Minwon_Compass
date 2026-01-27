package com.smart.complaint.routing_system.applicant.controller;

import com.smart.complaint.routing_system.applicant.dto.ComplaintDetailDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintHeatMap;
import com.smart.complaint.routing_system.applicant.dto.ComplaintInquiryDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintListDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintStatDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintSubmitDto;
import com.smart.complaint.routing_system.applicant.dto.KeywordsDto;
import com.smart.complaint.routing_system.applicant.dto.UserCheckDto;
import com.smart.complaint.routing_system.applicant.dto.UserLoginRequest;
import com.smart.complaint.routing_system.applicant.dto.UserNewPasswordDto;
import com.smart.complaint.routing_system.applicant.dto.UserSignUpDto;
import com.smart.complaint.routing_system.applicant.dto.UserEmailDto;
import com.smart.complaint.routing_system.applicant.service.ApplicantService;
import com.smart.complaint.routing_system.applicant.service.ComplaintService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

// 민원인 컨트롤러
@Tag(name = "민원인 컨트롤러", description = "민원인용 민원 관리 API")
@RestController
@RequiredArgsConstructor
@Slf4j
public class ApplicantController {

    private final ApplicantService applicantService;
    private final ComplaintService complaintService;

    @Operation(summary = "회원 가입 엔드포인트", description = "아이디, 비밀번호, 이메일, 이름을 받아 회원가입")
    @PostMapping("api/applicant/signup")
    public ResponseEntity<String> applicantSignUp(@RequestBody UserSignUpDto signUpDto,
            @RequestHeader(value = "CROSS-KEY", required = true) String key) {

        String result = applicantService.applicantSignUp(signUpDto, key);

        return ResponseEntity.ok(result);
    }

    @Operation(summary = "로그인 엔드포인트", description = "사용자의 아이디, 비밀번호를 통해 로그인")
    @PostMapping("api/applicant/login")
    public ResponseEntity<Map<String, String>> applicantLogin(@RequestBody UserLoginRequest loginRequest) {

        String token = applicantService.applicantLogin(loginRequest);

        return ResponseEntity.ok(Map.of("accessToken", token));
    }

    @Operation(summary = "사용자 아이디, 이메일 중복 확인", description = "중복 확인 버튼 클릭 시 동작, 중복이 있을 경우 알림")
    @PostMapping("api/applicant/check-id")
    public ResponseEntity<Boolean> checkUserIdAvailability(@RequestBody UserCheckDto checkDto) {

        boolean isAvailable = applicantService.isUserIdEmailAvailable(checkDto.checkString(), checkDto.type());

        return ResponseEntity.ok(isAvailable);
    }

    @Operation(summary = "이메일로 아이디 조회", description = "아이디 분실 시 이메일을 입력하여 마스킹된 아이디를 반환")
    @PostMapping("/api/applicant/userinfo")
    public ResponseEntity<Map<String, String>> getUserInfo(@RequestBody UserEmailDto emailDto) {

        String userId = applicantService.getUserIdByEmail(emailDto.email());

        return ResponseEntity.ok(Map.of("userId", userId));
    }

    @Operation(summary = "새 임시 비밀번호 발급", description = "이메일을 통해 임시 랜덤 비밀번호 발급")
    @PostMapping("/api/applicant/newpw")
    public ResponseEntity<Map<String, String>> postMethodName(@RequestBody UserNewPasswordDto userNewPasswordDto) {

        applicantService.updatePassword(userNewPasswordDto);

        return ResponseEntity.ok(null);
    }

    @Operation(summary = "토큰 유효성 검사 엔드포인트", description = "사용자의 토큰이 유효한지 확인한다.")
    @GetMapping("/api/auth/validate")
    public ResponseEntity<?> validateToken(@AuthenticationPrincipal String providerId) {
        if (providerId == null) {
            System.out.println("컨트롤러: 인증된 유저 정보가 없습니다.");
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok().build();
    }

    @Operation(summary = "가장 최근 작성한 민원 3개 조회", description = "로그인 시 본인 민원, 비로그인 시 전체 최신 민원 반환")
    @GetMapping("/api/applicant/complaints/top3")
    public ResponseEntity<List<ComplaintDto>> getTop3RecentComplaints(@AuthenticationPrincipal Object principal) {
        String id = null;
        if (principal != null && !principal.equals("anonymousUser")) {
            try {
                id = principal.toString();
            } catch (NumberFormatException e) {
                log.error("사용자 ID 파싱 에러: {}", principal);
            }
        }
        List<ComplaintDto> myComplaints = applicantService.getTop3RecentComplaints(id);
        return ResponseEntity.ok(myComplaints);
    }

    @Operation(summary = "민원 상세 조회", description = "민원 ID를 통해 특정 민원의 상세 내역과 답변을 조회")
    @GetMapping("/api/applicant/complaints/{id}")
    public ResponseEntity<ComplaintDetailDto> getMethodName(@PathVariable Long id) {

        ComplaintDetailDto complaintDetailDto = applicantService.getComplaintDetails(id);

        return ResponseEntity.ok(complaintDetailDto);
    }

    @Operation(summary = "모든 민원 조회", description = "JWT를 통해 전체 민원을 조회")
    @GetMapping("/api/applicant/complaints")
    public ResponseEntity<List<ComplaintListDto>> getAllComplaints(@AuthenticationPrincipal String applicantId,
            String keyword) {

        System.out.println("현재 로그인한 사용자:" + applicantId);
        // 현재 로그인한 사용자의 모든 민원 조회
        List<ComplaintListDto> complaints = applicantService.getAllComplaints(applicantId, keyword);

        return ResponseEntity.ok(complaints);
    }

    @Operation(summary = "모든 민원 조회(lat + lon)", description = "지도에 표시할 모든 민원을 조회")
    @GetMapping("/api/applicant/heatmap")
    public ResponseEntity<List<ComplaintHeatMap>> getAllComplaintsWithLatLon() {

        List<ComplaintHeatMap> complaints = applicantService.getAllComplaintsWithLatLon();

        return ResponseEntity.ok(complaints);
    }

    @Operation(summary = "민원 접수 + llm 분석 및 정규화", description = "제출된 민원을 분석하고 정규화하여 저장")
    @PostMapping("/api/applicant/complaint")
    public ResponseEntity<String> submitComplaint(@AuthenticationPrincipal String applicantId,
            @RequestBody ComplaintSubmitDto complaintSubmitDto) {

        Long id = complaintService.receiveComplaint(applicantId, complaintSubmitDto);
        complaintService.analyzeComplaint(id, applicantId, complaintSubmitDto);

        return ResponseEntity.ok("전송이 완료되었습니다.");
    }

    @Operation(summary = "추가 민원을 접수", description = "챗 형식으로 민원에 대해 답변이 온 경우 추가로 민원을 제출 가능")
    @PostMapping("/api/applicant/complaints/{id}/comments")
    public ResponseEntity<String> postMethodName(@PathVariable Long id, @RequestBody ComplaintInquiryDto inquiryDto) {

        complaintService.crateNewInquiry(id, inquiryDto);

        return ResponseEntity.ok("");
    }

    @Operation(summary = "메인 페이지에 보여질 통계 데이터", description = "기간 별 민원의 처리율 등을 조회 및 분석하여 반환")
    @Cacheable(value = "complaintStats", key = "'mainStat'")
    @GetMapping("/api/applicant/complaints-stat")
    public ResponseEntity<ComplaintStatDto> calculateStat() {

        ComplaintStatDto statDtos = complaintService.calculateStat();

        return ResponseEntity.ok(statDtos);
    }

    @Operation(summary = "메인 페이지에 보여질 통계 데이터2", description = "기간 동안 가장 많았던 키워드 10가지를 분석 후 반환")
    @Cacheable(value = "complaintKeywords", key = "'mainKeywords'")
    @GetMapping("/api/applicant/complaints-keyword")
    public ResponseEntity<List<KeywordsDto>> getKeywords() {

        List<KeywordsDto> keywordsDto = complaintService.calculateKeywords();

        return ResponseEntity.ok(keywordsDto);
    }

    @Operation(summary = "민원 취하", description = "현재 보고 있는 민원을 취하")
    @PutMapping("/api/applicant/complaints/{id}")
    public ResponseEntity<String> cancelComplaint(@PathVariable Long id) {

        complaintService.updateStatus(id);

        return ResponseEntity.ok(null);
    }

    @Operation(summary = "민원 종결", description = "현재 보고 있는 민원을 종결")
    @PatchMapping("/api/applicant/complaints/{id}/close")
    public ResponseEntity<String> closeComplaint(@PathVariable Long id) {

        complaintService.closeComplaint(id);

        return ResponseEntity.ok(null);
    }
}