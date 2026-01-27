package com.smart.complaint.routing_system.applicant.service;

import com.smart.complaint.routing_system.exception.LoginFailedException;
import com.smart.complaint.routing_system.applicant.entity.User;
import org.springframework.stereotype.Service;

import com.smart.complaint.routing_system.applicant.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public User authenticate(String username, String password) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new LoginFailedException("로그인 정보가 일치하지 않습니다."));
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new LoginFailedException("로그인 정보가 일치하지 않습니다.");
        }

        return user;
    }
}