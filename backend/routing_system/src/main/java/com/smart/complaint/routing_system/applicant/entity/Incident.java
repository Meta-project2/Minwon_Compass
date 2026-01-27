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

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "incident_status")
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    private IncidentStatus status;

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

    public void updateClosedAt(LocalDateTime lastOccurred) {
        this.closedAt = lastOccurred;
    }

    public void updateTitle(String title) {
        this.title = title;
    }

    public void updateStatus(IncidentStatus newStatus) {
        this.status = newStatus;
    }

    public void updateComplaintCount(int count) {
        this.complaintCount = count;
    }
}