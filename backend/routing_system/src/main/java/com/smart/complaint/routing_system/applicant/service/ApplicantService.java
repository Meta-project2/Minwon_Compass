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
import com.smart.complaint.routing_system.applicant.dto.UserSignUpDto;
import com.smart.complaint.routing_system.applicant.entity.Complaint;
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

        // 10자리 생성
        for (int i = 0; i < 10; i++) {
            int index = random.nextInt(chars.length());
            sb.append(chars.charAt(index));
        }

        String password = sb.toString();

        // 검증 로직: 규칙에 맞지 않으면 다시 생성(재귀)하거나 보완 로직 추가
        if (!password.matches("^(?=.*[A-Za-z])(?=.*\\d)(?=.*[!@#$%^&*])[A-Za-z\\d!@#$%^&*]{8,}$")) {
            return generateTemporaryPassword();
        }

        return password;
    }

    @Transactional
    public Boolean updatePassword(String email) {

        String newRandomPw = generateTemporaryPassword();
        // 2. 사용자 엔티티 조회
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorMessage.USER_NOT_FOUND));

        // 3. 비밀번호 암호화 후 엔티티 수정
        // (Spring Security의 PasswordEncoder를 주입받아 사용해야 로그인 시 인증 가능)
        String encodedPassword = encoder.encode(newRandomPw);
        user.changePassword(encodedPassword);
        // save 없어도 transactional 어노테이션으로 자동 적용

        // 4. 이메일 발송
        emailService.sendTemporaryPassword(email, newRandomPw);

        return true;
    }

    public List<ComplaintDto> getTop3RecentComplaints(Long applicantId) {

        return complaintRepository.findTop3RecentComplaintByApplicantId(applicantId);
    }

    public ComplaintDetailDto getComplaintDetails(Long complaintId) {

        log.info("사용자: " + complaintId);
        Complaint foundComplaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new BusinessException(ErrorMessage.COMPLAINT_NOT_FOUND));

        List<ChildComplaintDto> childComplaintDto = complaintRepository.findChildComplaintsByParentId(complaintId);

        return ComplaintDetailDto.from(foundComplaint, childComplaintDto);
    }

    public List<ComplaintListDto> getAllComplaints(String applicantId, String keyword) {

        Long id = Long.parseLong(applicantId);

        return complaintRepository.findAllByApplicantId(id, keyword);
    }

    public List<ComplaintHeatMap> getAllComplaintsWithLatLon() {

        return complaintRepository.getAllComplaintsWithLatLon();
    }
}
