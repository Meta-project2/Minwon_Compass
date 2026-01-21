package com.smart.complaint.routing_system.applicant.entity;

import com.smart.complaint.routing_system.applicant.domain.IncidentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "incidents")
@Getter
@Setter
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

//    @Enumerated(EnumType.STRING)
//    @Column(columnDefinition = "incident_status")
//    @Builder.Default
//    private IncidentStatus status = IncidentStatus.OPEN;

    // 수정 : 제목 수정 관련
    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "incident_status")
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    private IncidentStatus status;

    // [핵심 해결] 이 부분이 있어야 incident.getComplaints()를 쓸 수 있습니다.
    @OneToMany(mappedBy = "incident")
    private List<Complaint> complaints;

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

    private String keywords;

    // [추가] 최근 발생일 갱신
    public void updateClosedAt(LocalDateTime lastOccurred) {
        this.closedAt = lastOccurred;
    }

    // [수정] 제목을 바꿀 수 있게 해주는 기능
    public void updateTitle(String title) {
        this.title = title;
    }

    // [수정] 이 편의 메서드가 없어서 에러가 났습니다. 추가해주세요.
    public void updateStatus(IncidentStatus newStatus) {
        this.status = newStatus;
    }
    
    // [수정] 민원 숫자를 갱신하는 기능 (이동 시 자동 호출됨)
    public void updateComplaintCount(int count) {
        this.complaintCount = count;
    }
}