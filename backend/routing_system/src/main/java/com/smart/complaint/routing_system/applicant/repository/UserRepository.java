package com.smart.complaint.routing_system.applicant.repository;

import com.smart.complaint.routing_system.applicant.entitiy.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

// JpaRepository<User, Long>: 기본적인 CRUD (저장, 조회, 삭제) 기능 제공
// UserRepositoryCustom: 직접 짤 Querydsl 코드를 연결
public interface UserRepository extends JpaRepository<User, Long> /*, UserRepositoryCustom */ {

    // JPA 매직 메소드
    // SQL을 안 짜도 이름만으로 "SELECT * FROM users WHERE username = ?"를 만들어줌
    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);
}