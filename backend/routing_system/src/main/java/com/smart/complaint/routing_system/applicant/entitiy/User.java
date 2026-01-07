package com.smart.complaint.routing_system.applicant.entitiy;

import com.smart.complaint.routing_system.applicant.domain.UserRole;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    // 테스트용 생성자 (회원가입 로직)
    public User(String username, String password, String displayName, UserRole role) {
        this.username = username;
        this.password = password;
        this.displayName = displayName;
        this.role = role;
    }
}