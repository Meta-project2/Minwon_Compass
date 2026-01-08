package com.smart.complaint.routing_system.applicant.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QComplaint is a Querydsl query type for Complaint
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QComplaint extends EntityPathBase<Complaint> {

    private static final long serialVersionUID = -168105923L;

    public static final QComplaint complaint = new QComplaint("complaint");

    public final StringPath addressText = createString("addressText");

    public final StringPath answer = createString("answer");

    public final NumberPath<Long> answeredBy = createNumber("answeredBy", Long.class);

    public final StringPath body = createString("body");

    public final DateTimePath<java.time.LocalDateTime> closedAt = createDateTime("closedAt", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> createdAt = createDateTime("createdAt", java.time.LocalDateTime.class);

    public final NumberPath<Long> currentDepartmentId = createNumber("currentDepartmentId", Long.class);

    public final NumberPath<Integer> districtId = createNumber("districtId", Integer.class);

    public final NumberPath<Long> id = createNumber("id", Long.class);

    public final NumberPath<Long> incidentId = createNumber("incidentId", Long.class);

    public final DateTimePath<java.time.LocalDateTime> incidentLinkedAt = createDateTime("incidentLinkedAt", java.time.LocalDateTime.class);

    public final NumberPath<java.math.BigDecimal> incidentLinkScore = createNumber("incidentLinkScore", java.math.BigDecimal.class);

    public final NumberPath<java.math.BigDecimal> lat = createNumber("lat", java.math.BigDecimal.class);

    public final NumberPath<java.math.BigDecimal> lon = createNumber("lon", java.math.BigDecimal.class);

    public final DateTimePath<java.time.LocalDateTime> receivedAt = createDateTime("receivedAt", java.time.LocalDateTime.class);

    public final EnumPath<ComplaintStatus> status = createEnum("status", ComplaintStatus.class);

    public final StringPath title = createString("title");

    public final DateTimePath<java.time.LocalDateTime> updatedAt = createDateTime("updatedAt", java.time.LocalDateTime.class);

    public final EnumPath<UrgencyLevel> urgency = createEnum("urgency", UrgencyLevel.class);

    public QComplaint(String variable) {
        super(Complaint.class, forVariable(variable));
    }

    public QComplaint(Path<? extends Complaint> path) {
        super(path.getType(), path.getMetadata());
    }

    public QComplaint(PathMetadata metadata) {
        super(Complaint.class, metadata);
    }

}

