package com.smart.complaint.routing_system.applicant.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QComplaintNormalization is a Querydsl query type for ComplaintNormalization
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QComplaintNormalization extends EntityPathBase<ComplaintNormalization> {

    private static final long serialVersionUID = -1124181920L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QComplaintNormalization complaintNormalization = new QComplaintNormalization("complaintNormalization");

    public final QComplaint complaint;

    public final StringPath coreCause = createString("coreCause");

    public final StringPath coreRequest = createString("coreRequest");

    public final DateTimePath<java.time.LocalDateTime> createdAt = createDateTime("createdAt", java.time.LocalDateTime.class);

    public final NumberPath<Integer> districtId = createNumber("districtId", Integer.class);

    public final ArrayPath<double[], Double> embedding = createArray("embedding", double[].class);

    public final NumberPath<Long> id = createNumber("id", Long.class);

    public final BooleanPath isCurrent = createBoolean("isCurrent");

    public final SimplePath<Object> keywordsJsonb = createSimple("keywordsJsonb", Object.class);

    public final StringPath locationHint = createString("locationHint");

    public final StringPath neutralSummary = createString("neutralSummary");

    public final StringPath targetObject = createString("targetObject");

    public final StringPath urgencySignal = createString("urgencySignal");

    public QComplaintNormalization(String variable) {
        this(ComplaintNormalization.class, forVariable(variable), INITS);
    }

    public QComplaintNormalization(Path<? extends ComplaintNormalization> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QComplaintNormalization(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QComplaintNormalization(PathMetadata metadata, PathInits inits) {
        this(ComplaintNormalization.class, metadata, inits);
    }

    public QComplaintNormalization(Class<? extends ComplaintNormalization> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.complaint = inits.isInitialized("complaint") ? new QComplaint(forProperty("complaint"), inits.get("complaint")) : null;
    }

}

