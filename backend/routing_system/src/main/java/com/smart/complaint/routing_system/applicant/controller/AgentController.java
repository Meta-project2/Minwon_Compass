package com.smart.complaint.routing_system.applicant.controller; // ★ 본인 패키지 위치에 맞게 수정하세요!

import com.smart.complaint.routing_system.applicant.dto.AgentLoginRequestDto;
import com.smart.complaint.routing_system.applicant.entity.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import com.smart.complaint.routing_system.applicant.service.AuthService;
import com.smart.complaint.routing_system.applicant.domain.UserRole;

import org.springframework.security.core.Authentication;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "공무원 인증 API", description = "공무원/관리자 전용 인증 API (세션 방식)")
@RestController
@RequestMapping("/api/agent") // 공무원 전용 주소
@RequiredArgsConstructor
public class AgentController {

    private final AuthService authService;

    @Operation(summary = "내 정보 조회", description = "현재 세션 로그인된 사용자 정보를 반환합니다.")
    @GetMapping("/me")
    public ResponseEntity<?> getMe(HttpServletRequest request) {
        HttpSession session = request.getSession(false);

        // 개발 편의: 세션 없으면 1번 유저(admin)
//        if (session == null || session.getAttribute("LOGIN_USER") == null) {
//            Map<String, Object> mockUser = new HashMap<>();
//            mockUser.put("id", 1L); // ID 1번
//            mockUser.put("username", "admin");
//            mockUser.put("displayName", "김공무(개발용)");
//            mockUser.put("role", "AGENT");
//            return ResponseEntity.ok(mockUser);
//        }

        User user = (User) session.getAttribute("LOGIN_USER");
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("displayName", user.getDisplayName());
        response.put("role", user.getRole());
        String deptName = (user.getDepartment() != null) ? user.getDepartment().getName() : "소속 없음";
        response.put("departmentName", deptName);

        return ResponseEntity.ok(response);
    }

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
            @ApiResponse(responseCode = "400", description = "잘못된 요청 (비밀번호 불일치 또는 없는 아이디)", content = @Content),
            @ApiResponse(responseCode = "403", description = "권한 없음 (로그인은 됐으나 공무원이 아님)", content = @Content)
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

        // ★ 핵심 수정 사항: 스프링 시큐리티 인증 객체 생성
        // DB에 저장된 권한(AGENT 등)을 스프링 시큐리티가 읽을 수 있는 형태로 변환 (ROLE_ 접두사 주의)
        String roleName = "ROLE_" + user.getRole().name();
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                user.getUsername(),
                null,
                List.of(new SimpleGrantedAuthority(roleName)));

        // ★ 시큐리티 컨텍스트에 인증 정보 저장 (이걸 해야 시큐리티가 "로그인 성공했네!"라고 인정함)
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // 세션 생성 및 유지
        HttpSession session = httpRequest.getSession(true);
        session.setAttribute("LOGIN_USER", user);

        // 세션에 시큐리티 컨텍스트도 명시적으로 저장 (세션 방식일 때 필수)
        session.setAttribute("SPRING_SECURITY_CONTEXT", SecurityContextHolder.getContext());

        session.setMaxInactiveInterval(1800);

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("message", "로그인 성공");
        responseBody.put("username", user.getUsername());
        responseBody.put("role", user.getRole());

        String deptName = (user.getDepartment() != null) ? user.getDepartment().getName() : "소속 없음";
        responseBody.put("departmentName", deptName);
        
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