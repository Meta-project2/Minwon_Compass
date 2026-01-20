package com.smart.complaint.routing_system.applicant.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.smart.complaint.routing_system.applicant.entity.SocialAuth;

public interface SocialAuthRepository extends JpaRepository<SocialAuth, Long> {

    Optional<SocialAuth> findByProviderAndProviderId(String provider, String providerId);    
}