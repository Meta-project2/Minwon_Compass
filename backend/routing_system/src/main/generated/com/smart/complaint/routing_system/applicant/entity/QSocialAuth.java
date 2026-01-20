package com.smart.complaint.routing_system.applicant.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QSocialAuth is a Querydsl query type for SocialAuth
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QSocialAuth extends EntityPathBase<SocialAuth> {

    private static final long serialVersionUID = 2057662819L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QSocialAuth socialAuth = new QSocialAuth("socialAuth");

    public final DateTimePath<java.time.LocalDateTime> connectedAt = createDateTime("connectedAt", java.time.LocalDateTime.class);

    public final NumberPath<Long> id = createNumber("id", Long.class);

    public final StringPath provider = createString("provider");

    public final StringPath providerId = createString("providerId");

    public final QUser user;

    public QSocialAuth(String variable) {
        this(SocialAuth.class, forVariable(variable), INITS);
    }

    public QSocialAuth(Path<? extends SocialAuth> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QSocialAuth(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QSocialAuth(PathMetadata metadata, PathInits inits) {
        this(SocialAuth.class, metadata, inits);
    }

    public QSocialAuth(Class<? extends SocialAuth> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.user = inits.isInitialized("user") ? new QUser(forProperty("user"), inits.get("user")) : null;
    }

}

