package com.smart.complaint.routing_system.applicant.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "districts")
public class District {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 50)
    private String name; // 강남구, 서초구 등

    @Column(name = "city_name", length = 50)
    private String cityName;

    @Column(name = "admin_code", length = 20)
    private String adminCode;
}