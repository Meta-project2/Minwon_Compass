import axios from 'axios';
import Swal from 'sweetalert2';

const api = axios.create({
    baseURL: '/api',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            localStorage.removeItem('accessToken');
            Swal.fire('세션 만료', '다시 로그인해주세요.', 'warning').then(() => {
                window.location.href = '/applicant/login';
            });
        }
        return Promise.reject(error);
    }
);

export default api;