import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const LoginSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            localStorage.setItem('accessToken', token);
            navigate('/applicant/main');
        } else {
            alert("로그인 실패!");
            navigate('/applicant/login');
        }
    }, [searchParams, navigate]);

    return <div>로그인 처리 중입니다...</div>;
};

export default LoginSuccess