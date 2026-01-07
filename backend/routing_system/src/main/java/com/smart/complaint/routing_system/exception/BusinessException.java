package com.smart.complaint.routing_system.exception;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {
    private final int status;
    private final String message;

    public BusinessException(int status, String message) {
        super(message);
        this.status = status;
        this.message = message;
    }
}
