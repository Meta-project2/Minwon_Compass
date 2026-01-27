package com.smart.complaint.routing_system.applicant.service;

import java.security.SecureRandom;
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
import com.smart.complaint.routing_system.applicant.dto.ChildComplaintDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintDetailDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintDto;
import com.smart.complaint.routing_system.applicant.dto.ComplaintHeatMap;
import com.smart.complaint.routing_system.applicant.dto.ComplaintListDto;
import com.smart.complaint.routing_system.applicant.dto.UserLoginRequest;
import com.smart.complaint.routing_system.applicant.dto.UserNewPasswordDto;
import com.smart.complaint.routing_system.applicant.dto.UserSignUpDto;
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
    private final EmailService emailService;

    @Transactional
    public String applicantSignUp(UserSignUpDto signUpDto, String key) {

        log.info(key);
        if (!"my-secret-key-123".equals(key)) {
            log.warn("비정상적인 접근 차단 (잘못된 서비스 키)");
            throw new BusinessException(ErrorMessage.NOT_ALLOWED);
        }

        String hashedPassword = encoder.encode(signUpDto.password());
        User user = User.builder()
                .username(signUpDto.userId())
                .password(hashedPassword)
                .displayName(signUpDto.displayName())
                .email(signUpDto.email())
                .role(UserRole.CITIZEN)
                .build();
        userRepository.findByUsername(signUpDto.userId()).ifPresent(existingUser -> {
            log.info("중복된 사용자 아이디: " + signUpDto.userId());
            throw new BusinessException(ErrorMessage.USER_DUPLICATE);
        });
        userRepository.save(user);
        log.info(signUpDto.userId() + "사용자 생성");

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

    public boolean isUserIdEmailAvailable(String checkString, String type) {

        if (type.equals("id")) {
            if (userRepository.existsByUsername(checkString)) {
                // 중복된 경우 커스텀 예외 발생
                throw new BusinessException(ErrorMessage.USER_DUPLICATE);
            }
        } else {
            if (userRepository.existsByEmail(checkString)) {
                throw new BusinessException(ErrorMessage.USER_DUPLICATE);
            }
        }

        return true;
    }

    public String getUserIdByEmail(String email) {

        log.info(email + "사용자 아이디 찾기");
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorMessage.USER_NOT_FOUND));

        log.info("찾은 사용자: " + user.getUsername());

        String visible = user.getUsername().substring(0, 3);
        String masked = "*".repeat(user.getUsername().length() - 3);

        return visible + masked;
    }

    public String generateTemporaryPassword() {
        final String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 10; i++) {
            int index = random.nextInt(chars.length());
            sb.append(chars.charAt(index));
        }

        String password = sb.toString();
        if (!password.matches("^(?=.*[A-Za-z])(?=.*\\d)(?=.*[!@#$%^&*])[A-Za-z\\d!@#$%^&*]{8,}$")) {
            return generateTemporaryPassword();
        }

        return password;
    }

    @Transactional
    public Boolean updatePassword(UserNewPasswordDto userNewPasswordDto) {

        String newRandomPw = generateTemporaryPassword();
        User user = userRepository.findByUsernameAndEmail(userNewPasswordDto.id(), userNewPasswordDto.email())
                .orElseThrow(() -> new BusinessException(ErrorMessage.USER_NOT_FOUND));
        String encodedPassword = encoder.encode(newRandomPw);
        user.changePassword(encodedPassword);

        emailService.sendTemporaryPassword(user.getEmail(), newRandomPw);
        return true;
    }

    private boolean isPureNumeric(String str) {
        return str != null && str.matches("\\d+");
    }

    public List<ComplaintDto> getTop3RecentComplaints(String applicantId) {
        if (applicantId == null || applicantId.isEmpty() || applicantId.equals("anonymousUser")) {

            return complaintRepository.findTop3RecentComplaintByApplicantId(null);
        }
        Long actualUserId = null;

        if (isPureNumeric(applicantId)) {
            if (userRepository.existsById(Long.parseLong(applicantId))) {
                actualUserId = Long.parseLong(applicantId);
            }
        }

        if (actualUserId == null) {
            User socialUser = userRepository.findByProviderIdLike(applicantId)
                    .orElse(null);
            if (socialUser != null) {
                actualUserId = socialUser.getId();
            }
        }
        return complaintRepository.findTop3RecentComplaintByApplicantId(actualUserId);
    }

    public ComplaintDetailDto getComplaintDetails(Long complaintId) {

        log.info("사용자: " + complaintId);
        ComplaintDetailDto foundComplaint = complaintRepository.findComplaintDetailById(complaintId);

        List<ChildComplaintDto> childComplaintDto = complaintRepository.findChildComplaintsByParentId(complaintId);

        return ComplaintDetailDto.withChildren(foundComplaint, childComplaintDto);
    }

    public List<ComplaintListDto> getAllComplaints(String applicantId, String keyword) {

        Long actualUserId = null;

        if (isPureNumeric(applicantId)) {
            if (userRepository.existsById(Long.parseLong(applicantId))) {
                actualUserId = Long.parseLong(applicantId);
            }
        }
        if (actualUserId == null) {
            User socialUser = userRepository.findByProviderIdLike(applicantId)
                    .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + applicantId));
            actualUserId = socialUser.getId();
        }

        return complaintRepository.findAllByApplicantId(actualUserId, keyword);
    }

    public List<ComplaintHeatMap> getAllComplaintsWithLatLon() {

        return complaintRepository.getAllComplaintsWithLatLon();
    }
}
