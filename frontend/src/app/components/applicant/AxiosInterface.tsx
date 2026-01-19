import axios from 'axios';
import Swal from 'sweetalert2';

const api = axios.create({
    baseURL: '/api', // 백엔드 주소
});

// 요청 인터셉터 (토큰 주입)
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 응답 인터셉터 (401 에러 감시)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('accessToken');
            Swal.fire('세션 만료', '다시 로그인해주세요.', 'warning').then(() => {
                window.location.href = '/login';
            });
        }
        return Promise.reject(error);
    }
);

export default api; // 핵심: 외부에서 쓸 수 있게 내보냅니다.