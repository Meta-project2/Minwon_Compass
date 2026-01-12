package com.smart.complaint.routing_system.applicant.service;

import java.util.List;

import com.smart.complaint.routing_system.applicant.repository.ComplaintRepository;
import com.smart.complaint.routing_system.applicant.repository.UserRepository;
import com.smart.complaint.routing_system.applicant.service.jwt.JwtTokenProvider;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.smart.complaint.routing_system.applicant.config.BusinessException;
import com.smart.complaint.routing_system.applicant.domain.UserRole;
import com.smart.complaint.routing_system.applicant.dto.ComplaintDto;
import com.smart.complaint.routing_system.applicant.dto.UserLoginRequest;
import com.smart.complaint.routing_system.applicant.entity.User;
import com.smart.complaint.routing_system.applicant.domain.ErrorMessage;

// 민원인 서비스
@Service
@RequiredArgsConstructor
@Slf4j
public class ApplicantService {

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder encoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public String applicantSignUp(UserLoginRequest loginRequest) {

        String hashedPassword = encoder.encode(loginRequest.password());
        User user = new User(loginRequest.userId(), hashedPassword, loginRequest.displayName(), loginRequest.email(),
                UserRole.CITIZEN);
        userRepository.findByUsername(loginRequest.userId()).ifPresent(existingUser -> {
            log.info("중복된 사용자 아이디: " + loginRequest.userId());
            throw new BusinessException(ErrorMessage.USER_DUPLICATE);
        });
        userRepository.save(user);
        log.info(loginRequest.userId() + "사용자 생성");

        return "회원가입에 성공하였습니다.";
    }

    public String applicantLogin(UserLoginRequest loginRequest) {

        User user = userRepository.findByUsername(loginRequest.userId())
                .orElseThrow(() -> new BusinessException(ErrorMessage.USER_NOT_FOUND));
        log.info("사용자 {} 로그인 시도", loginRequest.userId());
        if (!encoder.matches(loginRequest.password(), user.getPassword())) {
            throw new BusinessException(ErrorMessage.INVALID_PASSWORD);
        }
        log.info("사용자 {} 로그인 성공", loginRequest.userId());
        return jwtTokenProvider.createJwtToken(String.valueOf(user.getId()), user.getEmail());
    }

    public boolean isUserIdAvailable(String userId) {

        if (userRepository.existsByUsername(userId)) {
            // 중복된 경우 커스텀 예외 발생
            throw new BusinessException(ErrorMessage.USER_DUPLICATE);
        }
        log.info("사용 가능한 아이디: " + userId);
        return true;
    }

    public List<ComplaintDto> getTop3RecentComplaints(String applicantId) {

        return complaintRepository.findTop3RecentComplaintByApplicantId(applicantId);
    }

    public List<ComplaintDto> getAllComplaints(String applicantId, String keyword) {

        return complaintRepository.findAllByApplicantId(applicantId, null);
    }
}
