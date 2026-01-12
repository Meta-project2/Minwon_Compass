package com.smart.complaint.routing_system.applicant.config;

// 로그인 실패용 예외
public class LoginFailedException extends RuntimeException {
    public LoginFailedException(String message) {
        super(message);
    }
}