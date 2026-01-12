package com.smart.complaint.routing_system.applicant.service;

import com.smart.complaint.routing_system.applicant.dto.ComplaintDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintSearchResult;
import com.smart.complaint.routing_system.applicant.dto.NormalizationResponse;
import com.smart.complaint.routing_system.applicant.repository.ComplaintRepository;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.http.HttpStatusCode;

import java.util.List;
import java.util.Map;

@Service
public class AiService {

    private final RestClient restClient;
    private final ComplaintRepository complaintRepository;

    public AiService(ComplaintRepository complaintRepository) {
        this.complaintRepository = complaintRepository;
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

    public List<ComplaintSearchResult> getSimilarityScore(double[] queryEmbedding) {

        // 리포지토리를 호출하여 상위 3개의 유사 민원 가져오기
        List<ComplaintSearchResult> results = complaintRepository.findSimilarComplaint(queryEmbedding, 3);

        // 검색 결과가 비어있을 경우에 대한 처리
        if (results.isEmpty()) {
            System.out.println("[!] 유사한 과거 민원을 찾지 못했습니다.");
        }

        return results;
    }
}
