package com.smart.complaint.routing_system.applicant.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QIncident is a Querydsl query type for Incident
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QIncident extends EntityPathBase<Incident> {

    private static final long serialVersionUID = -981557504L;

    public static final QIncident incident = new QIncident("incident");

    public final NumberPath<java.math.BigDecimal> centroidLat = createNumber("centroidLat", java.math.BigDecimal.class);

    public final NumberPath<java.math.BigDecimal> centroidLon = createNumber("centroidLon", java.math.BigDecimal.class);

    public final DateTimePath<java.time.LocalDateTime> closedAt = createDateTime("closedAt", java.time.LocalDateTime.class);

    public final NumberPath<Integer> districtId = createNumber("districtId", Integer.class);

    public final NumberPath<Long> id = createNumber("id", Long.class);

    public final DateTimePath<java.time.LocalDateTime> openedAt = createDateTime("openedAt", java.time.LocalDateTime.class);

    public final EnumPath<com.smart.complaint.routing_system.applicant.domain.IncidentStatus> status = createEnum("status", com.smart.complaint.routing_system.applicant.domain.IncidentStatus.class);

    public final StringPath title = createString("title");

    public QIncident(String variable) {
        super(Incident.class, forVariable(variable));
    }

    public QIncident(Path<? extends Incident> path) {
        super(path.getType(), path.getMetadata());
    }

    public QIncident(PathMetadata metadata) {
        super(Incident.class, metadata);
    }

}

