package com.smart.complaint.routing_system.applicant.entity;

import com.smart.complaint.routing_system.applicant.domain.IncidentStatus;
import jakarta.persistence.*;
import lombok.*;


import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "incidents")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 200)
    private String title;

    @Column(name = "complaint_count")
    private Integer complaintCount;

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "incident_status")
    @Builder.Default
    private IncidentStatus status = IncidentStatus.OPEN;

    @Column(name = "district_id")
    private Integer districtId;

    @Column(name = "centroid_lat", precision = 10, scale = 7)
    private BigDecimal centroidLat;

    @Column(name = "centroid_lon", precision = 10, scale = 7)
    private BigDecimal centroidLon;

    @Column(name = "opened_at")
    private LocalDateTime openedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    // [추가] 제목 변경 메소드
    public void updateTitle(String newTitle) {
        this.title = newTitle;
    }

    // [추가] 민원 수 갱신 메소드
    public void updateComplaintCount(int count) {
        this.complaintCount = count;
    }

    // [추가] 최근 발생일 갱신
    public void updateClosedAt(LocalDateTime lastOccurred) {
        this.closedAt = lastOccurred;
    }

}