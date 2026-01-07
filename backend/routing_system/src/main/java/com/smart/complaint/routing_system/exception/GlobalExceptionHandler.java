package com.smart.complaint.routing_system.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.smart.complaint.routing_system.applicant.dto.ErrorResponse;

// 전역 예외 처리기
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException ex) {
        ErrorResponse reponse = ErrorResponse.builder()
                .status(ex.getStatus())
                .message(ex.getMessage())
                .build();
        return new ResponseEntity<>(reponse, HttpStatus.valueOf(ex.getStatus()));
    }
}
