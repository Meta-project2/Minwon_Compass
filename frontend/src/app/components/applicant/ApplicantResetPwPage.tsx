import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from './AxiosInterface';

interface ResetPasswordPageProps {
  onResetSuccess?: () => void;
}

export default function ApplicantResetPwPage({ onResetSuccess }: ResetPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  // Email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = emailRegex.test(email);

  // Mock function to verify email exists in database
  const verifyEmail = async () => {
    setErrorMessage('');

    // Validate email format
    if (!email.trim()) {
      Swal.fire({ icon: 'warning', title: '형식 오류', text: '이메일 주소를 입력해주세요.' });
      return;
    }

    if (!isValidEmail) {
      Swal.fire({ icon: 'warning', title: '형식 오류', text: '올바른 이메일 형식이 아닙니다. (예: example@email.com)' });
      return;
    }
  };

  const handleSendTempPassword = async () => {
    if (!isValidEmail) return;

    Swal.fire({
      title: '메일 발송 중...',
      text: '임시 비밀번호를 생성하여 메일을 보내고 있습니다.',
      allowOutsideClick: false, // 로딩 중 바깥 클릭으로 닫기 방지
      didOpen: () => {
        Swal.showLoading(); // 로딩 애니메이션 시작
      }
    });

    setIsVerifying(true);
    try {
      // 1. 여기서 실제 백엔드 API를 호출합니다 (이전에 만든 sendMail 로직 연결)
      await api.post('/applicant/newpw',
        { email: email },
      );

      Swal.fire({
        icon: 'success',
        title: '발송 완료',
        text: '입력하신 이메일로 임시 비밀번호가 발송되었습니다. 메일함을 확인해주세요.',
        confirmButtonText: '로그인으로 이동'
      }).then(() => {
        navigate("/applicant/login") // 성공 후 로그인 페이지 등으로 이동
      });

    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: '발송 실패',
        text: '가입된 계정을 찾을 수 없거나 서버 오류가 발생했습니다.'
      });
    } finally {
      setIsVerifying(false);
    }


  };

  const handleCancel = () => {
    navigate("/applicant/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">임시 비밀번호 발송</h1>
          <p className="text-lg text-gray-600">가입하신 이메일 주소를 입력하시면 임시 비밀번호를 보내드립니다.</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-lg">이메일 주소 *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="example@email.com"
                className="text-lg h-14 pl-12"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    verifyEmail();
                  }
                }}
              />
            </div>

            {/* 실시간 이메일 유효성 확인 */}
            {email && !isValidEmail && (
              <p className="text-orange-600 text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>올바른 이메일 형식을 입력해주세요.</span>
              </p>
            )}

            {email && isValidEmail && !errorMessage && (
              <p className="text-green-600 text-base flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
              </p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-blue-900 text-base font-medium">임시 비밀번호 안내</p>
            <p className="text-blue-800 text-sm mt-1">로그인 후 반드시 비밀번호를 변경해주시기 바랍니다.</p>
          </div>

          {/* Verify Button */}
          <div className="pt-4 space-y-3">
            <Button
              onClick={handleSendTempPassword}
              className="w-full h-14 text-lg"
              disabled={!email || !isValidEmail || isVerifying}
            >
              {isVerifying ? '메일 발송 중...' : '임시 비밀번호 받기'}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="w-full h-14 text-lg"
              disabled={isVerifying}
            >
              취소
            </Button>
          </div>

          {/* Helper Text */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-gray-600 text-base">
              계정 찾기에 어려움이 있으신가요?
            </p>
            <p className="text-center text-gray-500 text-sm mt-1">
              고객센터(1234-5678)로 문의해주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
