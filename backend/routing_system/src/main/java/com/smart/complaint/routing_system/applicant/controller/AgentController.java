package com.smart.complaint.routing_system.applicant.controller; // ★ 본인 패키지 위치에 맞게 수정하세요!

import com.smart.complaint.routing_system.applicant.dto.AgentLoginRequestDto;
import com.smart.complaint.routing_system.applicant.entitiy.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import com.smart.complaint.routing_system.applicant.service.AuthService;
import com.smart.complaint.routing_system.applicant.domain.UserRole;

import java.util.HashMap;
import java.util.Map;

@Tag(name = "Agent Auth API", description = "공무원/관리자 전용 인증 API (세션 방식)")
@RestController
@RequestMapping("/api/agent") // 공무원 전용 주소
@RequiredArgsConstructor
public class AgentController {

    private final AuthService authService;

    /**
     * 공무원 전용 로그인 (세션 방식)
     * POST /api/agent/login
     */
    @Operation(summary = "로그인", description = "아이디와 비밀번호를 받아 세션 로그인을 수행합니다.<br>성공 시 <b>JSESSIONID</b> 쿠키가 발급됩니다.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "{\n" +
                    "  \"role\": \"ADMIN\",\n" +
                    "  \"message\": \"로그인 성공\",\n" +
                    "  \"username\": \"admin\"\n" +
                    "}"),
            @ApiResponse(responseCode = "400", description = "잘못된 요청 (비밀번호 불일치 또는 없는 아이디)",
                    content = @Content),
            @ApiResponse(responseCode = "403", description = "권한 없음 (로그인은 됐으나 공무원이 아님)",
                    content = @Content)
    })
    @PostMapping("/login")
    public ResponseEntity<?> agentLogin(@RequestBody AgentLoginRequestDto request, HttpServletRequest httpRequest) {

        // 아이디/비번 검증 (AuthService가 DB 확인하고 비번 대조함)
        // (DTO에 getUsername, getPassword가 있어야 함)
        User user = authService.authenticate(request.getUsername(), request.getPassword());

        // 공무원(AGENT) 아니면 쫓아냄 (이중 보안)
        if (user.getRole() != UserRole.AGENT && user.getRole() != UserRole.ADMIN) {
            throw new IllegalArgumentException("접근 권한이 없습니다.");
        }

        // 세션(Session) 생성 및 저장
        // getSession(true): 세션이 없으면 새로 만들고, 있으면 그거 가져옴
        HttpSession session = httpRequest.getSession(true);

        // 세션에 "LOGIN_USER"라는 이름으로 유저 정보(객체)를 통째로 저장
        session.setAttribute("LOGIN_USER", user);

        // 세션 유지 시간 설정 (초 단위) -> 1800초 = 30분
        // 30분 동안 아무런 요청 없으면 자동으로 로그아웃됨 (보안 필수 요건)
        session.setMaxInactiveInterval(1800);
        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("message", "로그인 성공");
        responseBody.put("username", user.getUsername());
        responseBody.put("role", user.getRole()); // "ADMIN" 또는 "AGENT" 값을 보냄

        // 예: { "message": "로그인 성공", "username": "admin1", "role": "ADMIN" }
        return ResponseEntity.ok(responseBody);
    }

    /**
     * 로그아웃 기능 (세션 날리기)
     * POST /api/agent/logout
     */
    @Operation(summary = "로그아웃", description = "현재 세션을 무효화하여 로그아웃 처리합니다.")
    @PostMapping("/logout")
    public ResponseEntity<?> agentLogout(HttpServletRequest httpRequest) {
        HttpSession session = httpRequest.getSession(false);
        if (session != null) {
            session.invalidate(); // 세션 삭제 (서버 메모리에서 삭제)
        }
        return ResponseEntity.ok("로그아웃 되었습니다.");
    }
}