import React, { useEffect, useState } from 'react';
import LoginButton from './ui/login-button';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ApplicationLoginPage = () => {
    const navigate = useNavigate();
    // 토큰이 이미 있다면 우선 로딩 상태를 true로 유지하여 화면 노출을 막습니다.
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');

        console.log("저장된 토큰:", token);

        // 1. 토큰이 아예 없으면 즉시 로딩 해제 -> 로그인 버튼 노출
        if (!token) {
            setIsLoading(false);
            return;
        }

        const validateToken = async () => {
            try {
                // 2. 백엔드 검증 시도
                await axios.get('http://localhost:8080/api/auth/validate', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // 3. 성공 시 메인으로 이동 (이동 중에도 화면은 여전히 로딩 상태)
                navigate('/applicant/main');
            } catch (error) {
                console.error("토큰 만료/유효하지 않음");
                localStorage.removeItem('accessToken');
                setIsLoading(false); // 실패 시에만 로그인 버튼 노출
            }
        };

        validateToken();
    }, [navigate]);

    // 로딩 중일 때는 빈 화면이나 스피너만 보여줍니다.
    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <p>사용자 인증 확인 중...</p>
            </div>
        );
    }

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