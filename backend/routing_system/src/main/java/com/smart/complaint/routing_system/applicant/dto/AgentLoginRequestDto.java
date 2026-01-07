package com.smart.complaint.routing_system.applicant.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "공무원 로그인 요청 DTO")
public class AgentLoginRequestDto {
    @Schema(description = "공무원 아이디", example = "admin")
    private String username;

    @Schema(description = "비밀번호", example = "1234")
    private String password;
}