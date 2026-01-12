import React, { useEffect, useState } from 'react';
import LoginButton from './applicant/ui/login-button';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ApplicationLoginPage = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const validateToken = async () => {
            const token = localStorage.getItem('accessToken');

            // 1. 토큰 자체가 없으면 그냥 로그인 페이지에 머뭄
            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                // 2. 백엔드에 토큰 유효성 검사 요청
                // 헤더에 Authorization: Bearer <token> 을 실어 보냅니다.
                await axios.get('http://localhost:8080/api/auth/validate', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                // 3. 검증 성공(200 OK) 시 메인 페이지로 이동
                navigate('/applicant/main');
            } catch (error) {
                // 4. 검증 실패(401 등) 시 로컬 스토리지 비우고 로그인 페이지 유지
                console.error("토큰이 만료되었거나 유효하지 않습니다.");
                localStorage.removeItem('accessToken');
                setIsLoading(false);
            }
        };

        validateToken();
    }, [navigate]);

    if (isLoading) return <div>사용자 인증 확인 중...</div>;

    // 백엔드(Spring Boot)의 OAuth2 엔드포인트로 이동시키는 함수
    const handleLogin = (provider: string) => {
        // 도커 환경이거나 로컬 환경인 경우에 맞춰 백엔드 주소를 입력합니다.
        // 브라우저 기준이므로 localhost:8080(Spring)을 호출합니다.
        window.location.href = `http://localhost:8080/oauth2/authorization/${provider}`;
    };

    return (
        <div style={{
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100vh',
            padding: '20px',
            backgroundColor: '#f9f9f9'
        }}>
            <h1 style={{ marginBottom: '40px' }}>민원 서비스 로그인</h1>
            
            <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                <p style={{ color: '#666', marginBottom: '20px' }}>
                    서비스 이용을 위해 로그인이 필요합니다.
                </p>
                
                <LoginButton provider="kakao" onClick={() => handleLogin('kakao')} />
                <LoginButton provider="naver" onClick={() => handleLogin('naver')} />
                
                <p style={{ marginTop: '20px', fontSize: '12px', color: '#999' }}>
                    로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
                </p>
            </div>
        </div>
    );
};

export default ApplicationLoginPage;