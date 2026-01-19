import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface FindIdPageProps {
  onGoBack?: () => void;
  onGoToResetPassword?: () => void;
}

export default function ApplicantFindIdPage({ onGoBack, onGoToResetPassword }: FindIdPageProps) {
  const [email, setEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundUserId, setFoundUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = emailRegex.test(email);
  const navigate = useNavigate();

  // Mock function to search for user ID by email
  const searchUserId = async () => {

    // Reset states
    setErrorMessage('');
    setFoundUserId(null);

    // Validate email format
    if (!email.trim()) {
      setErrorMessage('이메일 주소를 입력해주세요.');
      return;
    }

    if (!isValidEmail) {
      setErrorMessage('올바른 이메일 형식이 아닙니다. (예: example@email.com)');
      return;
    }

    setIsSearching(true);

    try {
      const response = await axios.post('/api/applicant/userinfo',
        { email: email }, // 1. POST는 두 번째 인자가 Body 데이터입니다.
      );

      setFoundUserId(response.data.userId);
    } catch (error: any) {
      // 4. 에러 처리 (사용자를 찾지 못하거나 서버 오류 시)
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setErrorMessage('입력하신 이메일로 가입된 계정을 찾을 수 없습니다.');
      } else if (error.response?.status === 403) {
        setErrorMessage('비정상적인 접근입니다. (보안 키 오류)');
      } else {
        setErrorMessage('서버 통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setIsSearching(false);
    }

    setIsSearching(false);
  };

  const handleReset = () => {
    navigate('/applicant/login');
  };

  const handleCancel = () => {
    navigate("/applicant/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">아이디 찾기</h1>
          <p className="text-lg text-gray-600">
            가입하신 이메일 주소로 아이디를 찾으실 수 있습니다
          </p>
        </div>

        {!foundUserId ? (
          // Email Input Form
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
                    setErrorMessage(''); // Clear error when typing
                  }}
                  placeholder="example@email.com"
                  className="text-lg h-14 pl-12"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      searchUserId();
                    }
                  }}
                />
              </div>

              {/* Real-time email format validation */}
              {email && !isValidEmail && (
                <p className="text-orange-600 text-base flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>올바른 이메일 형식을 입력해주세요.</span>
                </p>
              )}

              {email && isValidEmail && !errorMessage && (
                <p className="text-green-600 text-base flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>올바른 이메일 형식입니다.</span>
                </p>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-lg font-medium">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Search Button */}
            <div className="pt-4 space-y-3">
              <Button
                onClick={searchUserId}
                className="w-full h-14 text-lg"
                disabled={!email || !isValidEmail || isSearching}
              >
                {isSearching ? '검색 중...' : '아이디 찾기'}
              </Button>

              <Button
                variant="outline"
                onClick={handleCancel}
                className="w-full h-14 text-lg"
              >
                취소
              </Button>
            </div>
          </div>
        ) : (
          // Result Display - Masked User ID
          <div className="space-y-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-8 h-8 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-blue-900 mb-3">
                    아이디를 찾았습니다!
                  </h3>
                  <p className="text-base text-blue-800 mb-4">
                    입력하신 이메일(<span className="font-semibold">{email}</span>)로 가입된 아이디:
                  </p>
                  <div className="bg-white border-2 border-blue-300 rounded-lg p-4">
                    <p className="text-3xl font-bold text-center text-gray-900 tracking-wider">
                      {foundUserId}
                    </p>
                  </div>
                  <p className="text-sm text-blue-700 mt-3 text-center">
                    * 보안을 위해 아이디의 일부만 표시됩니다
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {onGoToResetPassword && (
                <Button
                  onClick={onGoToResetPassword}
                  className="w-full h-14 text-lg"
                >
                  비밀번호 재설정하기
                </Button>
              )}

              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full h-14 text-lg"
              >
                로그인 화면으로
              </Button>

              {onGoBack && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onGoBack}
                  className="w-full h-14 text-lg"
                >
                  로그인으로 돌아가기
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Helper Text */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-center text-gray-600 text-base">
            가입하신 이메일 주소가 기억나지 않으시나요?
          </p>
          <p className="text-center text-gray-500 text-sm mt-1">
            고객센터(1234-5678)로 문의해주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
