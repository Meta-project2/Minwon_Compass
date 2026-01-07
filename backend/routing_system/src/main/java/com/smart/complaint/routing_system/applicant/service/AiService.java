package com.smart.complaint.routing_system.applicant.service;

import com.smart.complaint.routing_system.applicant.dto.ComplaintDto;
import com.smart.complaint.routing_system.applicant.dto.NormalizationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.http.HttpStatusCode;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiService {

    private final RestClient restClient;

    public AiService() {
        this.restClient = RestClient.builder()
                .baseUrl("http://localhost:8000") // FastAPI 주소
                .build();
    }

    public NormalizationResponse getNormalization(ComplaintDto dto) {
        // Python FastAPI의 ComplaintRequest 구조에 맞춰 Map 생성
        Map<String, String> pythonRequestBody = Map.of(
                "title", dto.title(),
                "body", dto.body(),
                "district", dto.district()
        );

        return restClient.post()
                .uri("/analyze") // Python 엔드포인트
                .contentType(MediaType.APPLICATION_JSON)
                .body(pythonRequestBody)
                .retrieve()
                .onStatus(HttpStatusCode::isError, (request, response) -> {
                    throw new RuntimeException("AI 서버 호출 실패");
                })
                .body(NormalizationResponse.class);
    }
}
