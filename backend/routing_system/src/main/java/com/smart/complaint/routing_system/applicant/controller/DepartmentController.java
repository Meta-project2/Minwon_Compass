package com.smart.complaint.routing_system.applicant.controller;

import com.smart.complaint.routing_system.applicant.entity.Department;
import com.smart.complaint.routing_system.applicant.repository.DepartmentRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.stream.Collectors;

@Tag(name = "부서 API")
@RestController
@RequestMapping("/api/agent/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentRepository departmentRepository;

    @Operation(summary = "전체 부서 목록 조회", description = "이관 대상 선택을 위해 국/과 정보를 모두 포함하여 조회합니다.")
    @GetMapping
    public List<DepartmentSimpleDto> getAllDepartments() {
        return departmentRepository.findAllByIsActiveTrue().stream()
                .map(DepartmentSimpleDto::new)
                .collect(Collectors.toList());
    }

    // 간단한 DTO 내부 클래스
    @Data
    public static class DepartmentSimpleDto {
        private Long id;
        private String name;
        private String category; // GUK, GWA
        private Long parentId;   // 상위 부서 ID (필터링용)

        public DepartmentSimpleDto(Department d) {
            this.id = d.getId();
            this.name = d.getName();
            this.category = d.getCategory();
            // 부모가 있으면 ID 추출, 없으면 null
            this.parentId = (d.getParent() != null) ? d.getParent().getId() : null;
        }
    }
}