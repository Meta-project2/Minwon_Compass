package com.smart.complaint.routing_system.applicant.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;

@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QChildComplaint extends EntityPathBase<ChildComplaint> {

    private static final long serialVersionUID = 1109108381L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QChildComplaint childComplaint = new QChildComplaint("childComplaint");

    public final StringPath answer = createString("answer");

    public final NumberPath<Long> answeredBy = createNumber("answeredBy", Long.class);

    public final StringPath body = createString("body");

    public final DateTimePath<java.time.LocalDateTime> closedAt = createDateTime("closedAt",
            java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> createdAt = createDateTime("createdAt",
            java.time.LocalDateTime.class);

    public final NumberPath<Long> id = createNumber("id", Long.class);

    public final QComplaint parentComplaint;

    public final EnumPath<com.smart.complaint.routing_system.applicant.domain.ComplaintStatus> status = createEnum(
            "status", com.smart.complaint.routing_system.applicant.domain.ComplaintStatus.class);

    public final StringPath title = createString("title");

    public final DateTimePath<java.time.LocalDateTime> updatedAt = createDateTime("updatedAt",
            java.time.LocalDateTime.class);

    public QChildComplaint(String variable) {
        this(ChildComplaint.class, forVariable(variable), INITS);
    }

    public QChildComplaint(Path<? extends ChildComplaint> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QChildComplaint(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QChildComplaint(PathMetadata metadata, PathInits inits) {
        this(ChildComplaint.class, metadata, inits);
    }

    public QChildComplaint(Class<? extends ChildComplaint> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.parentComplaint = inits.isInitialized("parentComplaint")
                ? new QComplaint(forProperty("parentComplaint"), inits.get("parentComplaint"))
                : null;
    }

}
