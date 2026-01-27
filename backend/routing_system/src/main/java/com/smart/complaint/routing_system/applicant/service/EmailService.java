package com.smart.complaint.routing_system.applicant.service;

import org.springframework.stereotype.Service;

import com.smart.complaint.routing_system.applicant.config.BusinessException;
import com.smart.complaint.routing_system.applicant.domain.ErrorMessage;

import org.springframework.mail.javamail.JavaMailSender;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendMail(String to, String subject, String body) {

        var message = mailSender.createMimeMessage();
        try {
            var helper = new org.springframework.mail.javamail.MimeMessageHelper(message, true);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(body, true);
            mailSender.send(message);
        } catch (Exception e) {
            throw new BusinessException(ErrorMessage.EMAIL_SEND_FAILURE);
        }
    }

    public void sendTemporaryPassword(String to, String tempPassword) {
        String subject = "[스마트 민원 포털] 임시 비밀번호 발급 안내입니다.";

        StringBuilder body = new StringBuilder();
        body.append(
                "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;'>");
        // Header
        body.append("  <div style='background-color: #1a56db; padding: 20px; text-align: center;'>");
        body.append("    <h2 style='color: white; margin: 0;'>스마트 민원 포털</h2>");
        body.append("  </div>");
        // Content
        body.append("  <div style='padding: 30px; line-height: 1.6; color: #333;'>");
        body.append("    <p>안녕하세요. 본 메일은 <strong>비밀번호 찾기</strong> 요청에 의해 발급된 임시 비밀번호 안내 메일입니다.</p>");
        body.append("    <p>아래의 임시 비밀번호로 로그인하신 후, 보안을 위해 <strong>반드시 비밀번호를 변경</strong>해 주시기 바랍니다.</p>");
        body.append(
                "    <div style='background-color: #f8f9fa; border: 1px dashed #cbd5e1; padding: 20px; text-align: center; margin: 20px 0;'>");
        body.append("      <span style='font-size: 14px; color: #64748b;'>임시 비밀번호</span><br/>");
        body.append("      <strong style='font-size: 24px; color: #1a56db; letter-spacing: 2px;'>").append(tempPassword)
                .append("</strong>");
        body.append("    </div>");
        body.append("    <p style='font-size: 14px; color: #ef4444;'>* 임시 비밀번호는 보안상 탈취 위험이 있으니 즉시 변경을 권장합니다.</p>");
        body.append("  </div>");
        // Footer
        body.append(
                "  <div style='background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;'>");
        body.append("    본 메일은 발신 전용입니다. 문의사항은 고객센터(1588-XXXX)를 이용해 주세요.<br/>");
        body.append("    Copyright © Smart Gov Portal. All rights reserved.");
        body.append("  </div>");
        body.append("</div>");

        sendMail(to, subject, body.toString());
    }
}
