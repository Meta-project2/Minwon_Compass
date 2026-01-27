package com.smart.complaint.routing_system.applicant.repository;

import java.util.Optional;

import static com.smart.complaint.routing_system.applicant.entity.QUser.user;

import com.querydsl.jpa.impl.JPAQueryFactory;
import com.smart.complaint.routing_system.applicant.entity.User;

import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class UserRepositoryCustomImpl implements UserRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Optional<User> findByProviderIdLike(String providerId) {
        return Optional.ofNullable(
                queryFactory
                        .selectFrom(user)
                        .where(user.username.endsWith(providerId))
                        .fetchOne());
    }
}