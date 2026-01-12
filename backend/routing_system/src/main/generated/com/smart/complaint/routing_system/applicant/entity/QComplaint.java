package com.smart.complaint.routing_system.applicant.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QComplaint is a Querydsl query type for Complaint
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QComplaint extends EntityPathBase<Complaint> {

    private static final long serialVersionUID = -168105923L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QComplaint complaint = new QComplaint("complaint");

    public final StringPath addressText = createString("addressText");

    public final StringPath answer = createString("answer");

    public final NumberPath<Long> answeredBy = createNumber("answeredBy", Long.class);

    public final StringPath body = createString("body");

    public final DateTimePath<java.time.LocalDateTime> closedAt = createDateTime("closedAt", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> createdAt = createDateTime("createdAt", java.time.LocalDateTime.class);

    public final NumberPath<Long> currentDepartmentId = createNumber("currentDepartmentId", Long.class);

    public final QDistrict district;

    public final NumberPath<Long> id = createNumber("id", Long.class);

    public final QIncident incident;

    public final DateTimePath<java.time.LocalDateTime> incidentLinkedAt = createDateTime("incidentLinkedAt", java.time.LocalDateTime.class);

    public final NumberPath<java.math.BigDecimal> incidentLinkScore = createNumber("incidentLinkScore", java.math.BigDecimal.class);

    public final NumberPath<java.math.BigDecimal> lat = createNumber("lat", java.math.BigDecimal.class);

    public final NumberPath<java.math.BigDecimal> lon = createNumber("lon", java.math.BigDecimal.class);

    public final DateTimePath<java.time.LocalDateTime> receivedAt = createDateTime("receivedAt", java.time.LocalDateTime.class);

    public final EnumPath<com.smart.complaint.routing_system.applicant.domain.ComplaintStatus> status = createEnum("status", com.smart.complaint.routing_system.applicant.domain.ComplaintStatus.class);

    public final StringPath title = createString("title");

    public final DateTimePath<java.time.LocalDateTime> updatedAt = createDateTime("updatedAt", java.time.LocalDateTime.class);

    public final EnumPath<com.smart.complaint.routing_system.applicant.domain.UrgencyLevel> urgency = createEnum("urgency", com.smart.complaint.routing_system.applicant.domain.UrgencyLevel.class);

    public QComplaint(String variable) {
        this(Complaint.class, forVariable(variable), INITS);
    }

    public QComplaint(Path<? extends Complaint> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QComplaint(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QComplaint(PathMetadata metadata, PathInits inits) {
        this(Complaint.class, metadata, inits);
    }

    public QComplaint(Class<? extends Complaint> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.district = inits.isInitialized("district") ? new QDistrict(forProperty("district")) : null;
        this.incident = inits.isInitialized("incident") ? new QIncident(forProperty("incident")) : null;
    }

}

