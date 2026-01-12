import React from 'react';

interface LoginButtonProps {
    provider: 'naver' | 'kakao';
    onClick: () => void;
}

const LoginButton = ({ provider, onClick }: LoginButtonProps) => {
    const styles = {
        naver: { bg: '#03C75A', text: '#white', label: '네이버로 시작하기' },
        kakao: { bg: '#FEE500', text: '#3C1E1E', label: '카카오로 시작하기' },
    };

    const currentStyle = styles[provider];

    return (
        <button
            onClick={onClick}
            style={{
                backgroundColor: currentStyle.bg,
                color: currentStyle.text,
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginBottom: '10px',
                fontSize: '16px'
            }}
        >
            {currentStyle.label}
        </button>
    );
};

export default LoginButton;