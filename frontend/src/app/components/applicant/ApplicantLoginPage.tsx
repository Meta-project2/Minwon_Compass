import React, { useEffect, useState } from 'react';
import LoginButton from './ui/login-button';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

const ApplicationLoginPage = () => {
    const navigate = useNavigate();
    // 토큰이 이미 있다면 우선 로딩 상태를 true로 유지하여 화면 노출을 막습니다.
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [idError, setIdError] = useState('');
    const [pwError, setPwError] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('accessToken');

        // 1. 토큰이 아예 없으면 즉시 로딩 해제 -> 로그인 버튼 노출
        if (!token) {
            setIsLoading(false);
            return;
        }

        const validateToken = async () => {
            try {
                // 2. 백엔드 검증 시도
                await axios.get('/api/auth/validate', {
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

    // 로딩 중일 때는 빈 화면이나 스피너만
    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <p>사용자 인증 확인 중...</p>
            </div>
        );
    }

    const validateId = (id: string) => {
        const idRegex = /^[a-z0-9]{5,15}$/;
        if (!id) {
            setIdError('아이디를 입력해주세요.');
        } else if (!idRegex.test(id)) {
            setIdError('아이디는 5~15자의 영문 소문자와 숫자만 가능합니다.');
        } else {
            setIdError('');
        }
    };

    // 비밀번호 검증 (8자 이상, 영문/숫자/특수문자 포함) - input이 있을때마다 검증
    const validatePw = (pw: string) => {
        const pwRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,20}$/;
        if (!pw) {
            setPwError('비밀번호를 입력해주세요.');
        } else if (!pwRegex.test(pw)) {
            setPwError('비밀번호는 8자 이상, 20자 이하의 영문/숫자/특수문자를 포함해야 합니다.');
        } else {
            setPwError('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. 즉시 검증용 정규식 (state를 기다리지 않음)
        const idRegex = /^[a-z0-9]{5,15}$/;
        const pwRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

        if (!userId) {
            Swal.fire({ icon: 'warning', title: '입력 누락', text: '아이디를 입력해주세요.' });
            return;
        }
        if (!idRegex.test(userId)) {
            Swal.fire({ icon: 'warning', title: '형식 오류', text: '아이디는 5~15자의 영문 소문자와 숫자만 가능합니다.' });
            return;
        }

        // --- 비밀번호 검증 ---
        if (!password) {
            Swal.fire({ icon: 'warning', title: '입력 누락', text: '비밀번호를 입력해주세요.' });
            return;
        }
        if (!pwRegex.test(password)) {
            Swal.fire({ icon: 'warning', title: '형식 오류', text: '비밀번호는 8자 이상, 영문/숫자/특수문자를 포함해야 합니다.' });
            return;
        }

        Swal.fire({
            title: '로그인 중...',
            text: '잠시만 기다려 주세요.',
            allowOutsideClick: false, // 로딩 중 바깥 클릭으로 끄기 방지
            didOpen: () => {
                Swal.showLoading(); // 기본 로딩 스피너 표시
            }
        });

        // 3. 모든 검증 통과 시에만 API 호출
        try {
            const response = await axios.post('/api/applicant/login', {
                userId: userId,
                password: password
            });

            Swal.close();
            // 성공 로직...
            localStorage.setItem('accessToken', response.data.accessToken);
            navigate('/applicant/main');

        } catch (error) {

            Swal.close();

            // 보안상 이유로 상세 에러가 무엇이든 사용자에게는 동일한 메시지를 보여줍니다.
            let displayMessage = '아이디 또는 비밀번호를 확인해주세요.';

            if (axios.isAxiosError(error)) {
                // 온다면 지정 아닐 경우 500으로
                const serverStatus = error.response?.status || 500;


                // 401(미인증)이나 404(찾을 수 없음) 모두 같은 메시지로 처리
                if (serverStatus === 401 || serverStatus === 404) {
                    displayMessage = '아이디 또는 비밀번호가 일치하지 않습니다.';
                } else if (serverStatus === 403) {
                    displayMessage = '접근 권한이 없거나 계정이 정지되었습니다.';
                } else if (serverStatus >= 500) {
                    displayMessage = '서버 통신에 문제가 발생했습니다.';
                }
            }

            Swal.fire({
                icon: 'error',
                title: '로그인 실패',
                text: displayMessage,
                confirmButtonColor: '#007bff'
            });
        }
    };

    // 백엔드(Spring Boot)의 OAuth2 엔드포인트로 이동시키는 함수
    const handleLogin = (provider: string) => {
        // 도커 환경이거나 로컬 환경인 경우에 맞춰 백엔드 주소를 입력합니다.
        // 브라우저 기준이므로 localhost:8080(Spring)을 호출합니다.
        window.location.href = `/oauth2/authorization/${provider}`;
    };

    const handleSignUp = () => {
        navigate('/applicant/signup');
    }

    const handleFindId = () => {
        navigate('/applicant/find-id');
    }

    const handleFindPassword = () => {
        navigate('/applicant/find-password');
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '20px',
            backgroundColor: '#f9f9f9',
            fontFamily: 'sans-serif'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                backgroundColor: '#fff',
                padding: '40px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
                <h1 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '24px', fontWeight: 'bold' }}>민원 서비스 로그인</h1>

                {/* --- 자체 로그인 Form --- */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                        type="text"
                        placeholder="5~15자의 영문 소문자와 숫자로 입력"
                        onChange={(e) => {
                            setUserId(e.target.value);
                            validateId(e.target.value); // 실시간 검증
                        }}
                        style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '15px' }}
                    />
                    <input
                        type="password"
                        placeholder="8자 이상, 영문/숫자/특수문자를 포함"
                        onChange={(e) => {
                            setPassword(e.target.value)
                            validatePw(e.target.value)
                        }}
                        style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '15px' }}
                    />
                    <button type="submit" style={{ cursor: 'pointer' }}>로그인</button>
                </form>

                {/* --- 보조 링크 (회원가입 등) --- */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px', fontSize: '14px', color: '#666' }}>
                    <span onClick={handleSignUp} style={{ cursor: 'pointer' }}>회원가입</span>
                    <span style={{ color: '#ddd' }}>|</span>
                    <span onClick={handleFindId} style={{ cursor: 'pointer' }}>아이디 찾기</span>
                    <span style={{ color: '#ddd' }}>|</span>
                    <span onClick={handleFindPassword} style={{ cursor: 'pointer' }}>비밀번호 찾기</span>
                </div>

                {/* --- 구분선 --- */}
                <div style={{ display: 'flex', alignItems: 'center', margin: '30px 0', color: '#999', fontSize: '13px' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#eee' }}></div>
                    <span style={{ margin: '0 10px' }}>또는</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#eee' }}></div>
                </div>

                {/* --- 하단 OAuth 섹션 --- */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <LoginButton provider="kakao" onClick={() => handleLogin('kakao')} />
                    <LoginButton provider="naver" onClick={() => handleLogin('naver')} />
                </div>

                <p style={{ marginTop: '30px', fontSize: '12px', color: '#999', textAlign: 'center' }}>
                    로그인 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
                </p>
            </div>
        </div>
    );
};

export default ApplicationLoginPage;