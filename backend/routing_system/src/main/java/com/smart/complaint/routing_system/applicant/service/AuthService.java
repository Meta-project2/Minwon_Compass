package com.smart.complaint.routing_system.applicant.service;

import com.smart.complaint.routing_system.applicant.config.LoginFailedException;
import com.smart.complaint.routing_system.applicant.entitiy.User;
import org.springframework.stereotype.Service;

import com.smart.complaint.routing_system.applicant.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * 공무원 로그인용: 비밀번호 검사 후 User 엔티티 원본 반환
     */
    public User authenticate(String username, String password) {
        // 아이디 조회
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new LoginFailedException("로그인 정보가 일치하지 않습니다."));

        // 비밀번호 대조
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new LoginFailedException("로그인 정보가 일치하지 않습니다.");
        }

        // User 엔티티 그대로 반환
        return user;
    }
}