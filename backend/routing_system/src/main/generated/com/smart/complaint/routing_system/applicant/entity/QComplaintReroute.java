package com.smart.complaint.routing_system.applicant.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QComplaintReroute is a Querydsl query type for ComplaintReroute
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QComplaintReroute extends EntityPathBase<ComplaintReroute> {

    private static final long serialVersionUID = -1297421063L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QComplaintReroute complaintReroute = new QComplaintReroute("complaintReroute");

    public final QComplaint complaint;

    public final DateTimePath<java.time.LocalDateTime> completedAt = createDateTime("completedAt", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> createdAt = createDateTime("createdAt", java.time.LocalDateTime.class);

    public final NumberPath<Long> id = createNumber("id", Long.class);

    public final NumberPath<Long> originDepartmentId = createNumber("originDepartmentId", Long.class);

    public final NumberPath<Long> requesterId = createNumber("requesterId", Long.class);

    public final StringPath requestReason = createString("requestReason");

    public final NumberPath<Long> reviewerId = createNumber("reviewerId", Long.class);

    public final StringPath status = createString("status");

    public final NumberPath<Long> targetDepartmentId = createNumber("targetDepartmentId", Long.class);

    public QComplaintReroute(String variable) {
        this(ComplaintReroute.class, forVariable(variable), INITS);
    }

    public QComplaintReroute(Path<? extends ComplaintReroute> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QComplaintReroute(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QComplaintReroute(PathMetadata metadata, PathInits inits) {
        this(ComplaintReroute.class, metadata, inits);
    }

    public QComplaintReroute(Class<? extends ComplaintReroute> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.complaint = inits.isInitialized("complaint") ? new QComplaint(forProperty("complaint"), inits.get("complaint")) : null;
    }

}

