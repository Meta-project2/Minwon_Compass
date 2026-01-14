package com.smart.complaint.routing_system.applicant.service;

import com.smart.complaint.routing_system.applicant.entity.Incident;
import com.smart.complaint.routing_system.applicant.repository.IncidentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class IncidentService {

    private final IncidentRepository incidentRepository;

    /**
     * 5건 이상인 주요 사건만 가져오는 기능
     */
    public Page<Incident> getMajorIncidents(Pageable pageable) {
        // 1. 아까 Repository에 만든 '5개 이상만 가져와!' 명령을 시킵니다.
        List<Incident> majorList = incidentRepository.findMajorIncidents();

        // 2. 가져온 리스트를 화면에서 쓸 수 있게 페이지(Page) 형태로 변환합니다.
        // (데이터가 많지 않으므로 자바에서 직접 자릅니다)
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), majorList.size());

        if (start > majorList.size()) {
            return new PageImpl<>(List.of(), pageable, majorList.size());
        }

        List<Incident> subList = majorList.subList(start, end);
        return new PageImpl<>(subList, pageable, majorList.size());
    }
}