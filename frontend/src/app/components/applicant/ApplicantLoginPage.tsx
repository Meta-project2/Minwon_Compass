import React, { useEffect, useState } from 'react';
import LoginButton from './ui/login-button';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

const ApplicationLoginPage = () => {
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [idError, setIdError] = useState('');
    const [pwError, setPwError] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('accessToken');

        if (!token) {
            setIsLoading(false);
            return;
        }

        const validateToken = async () => {
            try {
                await axios.get('/api/auth/validate', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                navigate('/applicant/main');
            } catch (error) {
                console.error("토큰 만료/유효하지 않음");
                localStorage.removeItem('accessToken');
                setIsLoading(false);
            }
        };

        validateToken();
    }, [navigate]);

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
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const response = await axios.post('/api/applicant/login', {
                userId: userId,
                password: password
            });

            Swal.close();
            localStorage.setItem('accessToken', response.data.accessToken);
            navigate('/applicant/main');

        } catch (error) {

            Swal.close();

            let displayMessage = '아이디 또는 비밀번호를 확인해주세요.';

            if (axios.isAxiosError(error)) {
                const serverStatus = error.response?.status || 500;

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

    const handleLogin = (provider: string) => {
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
                <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px', fontSize: '14px', color: '#666' }}>
                    <span onClick={handleSignUp} style={{ cursor: 'pointer' }}>회원가입</span>
                    <span style={{ color: '#ddd' }}>|</span>
                    <span onClick={handleFindId} style={{ cursor: 'pointer' }}>아이디 찾기</span>
                    <span style={{ color: '#ddd' }}>|</span>
                    <span onClick={handleFindPassword} style={{ cursor: 'pointer' }}>비밀번호 찾기</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', margin: '30px 0', color: '#999', fontSize: '13px' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#eee' }}></div>
                    <span style={{ margin: '0 10px' }}>또는</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#eee' }}></div>
                </div>
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