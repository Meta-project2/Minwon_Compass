package com.smart.complaint.routing_system.applicant.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.smart.complaint.routing_system.applicant.entity.Department;

public interface DepartmentRepository extends JpaRepository<Department, Long> {

    Optional<Department> findByName(String targetDeptName);
    List<Department> findAllByIsActiveTrue();
}
