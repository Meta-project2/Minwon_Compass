import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const LoginSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            // 1. 토큰을 로컬 스토리지에 저장 (이후 API 호출 시 헤더에 담아 보냄)
            localStorage.setItem('accessToken', token);
            // 2. 메인 민원 접수 페이지로 이동
            navigate('/applicant/main');
        } else {
            alert("로그인 실패!");
            navigate('/applicant/login');
        }
    }, [searchParams, navigate]);

    return <div>로그인 처리 중입니다...</div>;
};

export default LoginSuccess