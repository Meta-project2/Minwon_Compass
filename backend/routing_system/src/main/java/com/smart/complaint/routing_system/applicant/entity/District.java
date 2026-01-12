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

    // PostGIS(geom) 컬럼은 일단 매핑에서 제외
    // 이걸 매핑하려면 'hibernate-spatial' 라이브러리가 추가로 필요하고 설정이 복잡
    // 지금은 자바에서 좌표 계산할 일이 없으니 생략
}