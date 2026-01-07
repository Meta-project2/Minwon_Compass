package com.smart.complaint.routing_system.applicant.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // 로그인 실패 (401 Unauthorized)
    @ExceptionHandler(LoginFailedException.class)
    public ResponseEntity<Map<String, String>> handleLoginError(LoginFailedException e) {
        Map<String, String> response = new HashMap<>();
        response.put("code", "LOGIN_FAIL");
        response.put("message", e.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    // 그 외 일반적인 잘못된 요청 (400 Bad Request)
    // 다른 곳에서 발생한 IllegalArgumentException
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException e) {
        Map<String, String> response = new HashMap<>();
        response.put("code", "BAD_REQUEST");
        response.put("message", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    // 예상치 못한 모든 에러 (500 Internal Server Error)
    // NullPointerException 등 미처 못 잡은 에러들
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneralError(Exception e) {
        Map<String, String> response = new HashMap<>();
        response.put("code", "SERVER_ERROR");
        response.put("message", "서버 내부 오류가 발생했습니다. 관리자에게 문의하세요.");
        response.put("error", String.valueOf(e));
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}