package com.smart.complaint.routing_system.applicant.dto;

import lombok.Data;
import java.util.List;

public class IncidentRequestDto {

    // 제목 수정용
    @Data
    public static class UpdateTitle {
        private String title;
    }

    // 새 방 만들기용
    @Data
    public static class CreateRoom {
        private List<Long> complaintIds;
        private String title;
    }

    // 기존 방으로 이동용
    @Data
    public static class MoveComplaint {
        private List<Long> complaintIds;
        private Long targetIncidentId;
    }
}