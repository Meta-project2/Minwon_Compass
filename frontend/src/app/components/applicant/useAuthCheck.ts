import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from './AxiosInterface';
import Swal from 'sweetalert2';

export function useAuthGuard() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                handleUnauthorized("로그인이 필요한 서비스입니다.");
                return;
            }

            try {
                await api.get('/auth/validate');
            } catch (error) {
                handleUnauthorized("세션이 만료되었습니다. 다시 로그인해주세요.");
            }
        };

        const handleUnauthorized = (message: string) => {
            localStorage.removeItem('accessToken');
            Swal.fire({
                title: '접근 제한',
                text: message,
                icon: 'error',
                confirmButtonColor: '#1e40af',
                confirmButtonText: '확인'
            }).then(() => {
                navigate('/applicant/main');
            });
        };

        const protectedPaths = ['/applicant/complaints', '/applicant/complaints/form'];
        const isProtected = protectedPaths.some(path => location.pathname.startsWith(path));

        if (isProtected) {
            checkAuth();
        }
    }, [location.pathname, navigate]);
}