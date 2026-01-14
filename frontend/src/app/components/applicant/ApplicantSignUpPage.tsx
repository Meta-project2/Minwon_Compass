import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Check, X, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

interface SignupPageProps {
  onGoBack?: () => void;
  onSignupSuccess?: () => void;
}

export default function ApplicantSignUpPage({ onSignupSuccess }: SignupPageProps) {

  const navigate = useNavigate();

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isIdChecking, setIsIdChecking] = useState(false);
  const [isIdAvailable, setIsIdAvailable] = useState<boolean | null>(null);

  // Check if password matches
  const passwordsMatch = password && passwordConfirm && password === passwordConfirm;
  const passwordsNoMatch = passwordConfirm && password !== passwordConfirm;
  const isAllInputFilled =
    userId &&
    password &&
    passwordConfirm &&
    firstName &&
    lastName &&
    email &&
    passwordsMatch &&
    isIdAvailable === true;

  // Mock function to check if ID is available
  const checkIdAvailability = async () => {
    // 아이디 형식 검증
    const idRegex = /^[a-z0-9]{5,15}$/;
    if (!userId.trim()) {
      Swal.fire({ icon: 'warning', text: '아이디를 입력해주세요.' });
      return;
    }
    if (!idRegex.test(userId)) {
      Swal.fire({ icon: 'warning', text: '아이디는 5~15자의 영문 소문자와 숫자만 가능합니다.' });
      return;
    }
    setIsIdChecking(true);

    // 아이디 중복 확인 API 호출
    try {
      await axios.post(`http://localhost:8080/api/applicant/check-id`, { checkString: userId, type: "id" });
      setIsIdAvailable(true);
      Swal.fire({ icon: 'success', text: '사용 가능한 아이디입니다.' });
    } catch (error) {
      setIsIdAvailable(false);

      let displayMsg = '이미 사용 중인 아이디입니다.'; // 기본 메시지

      if (axios.isAxiosError(error) && error.response?.status === 500) {
        displayMsg = '서버 통신 중 오류가 발생했습니다.';
      }

      Swal.fire({
        icon: 'error',
        text: displayMsg
      });
    } finally {
      setIsIdChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const pwRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // 이메일 형식 추가

    // --- Validation (생략 없이 꼼꼼하게) ---
    if (!userId || !password || !passwordConfirm || !firstName || !lastName || !email) {
      Swal.fire({ icon: 'warning', title: '입력 누락', text: '모든 필수 항목을 입력해주세요.' });
      return;
    }
    if (isIdAvailable !== true) {
      Swal.fire({ icon: 'warning', title: '중복확인 필요', text: '아이디 중복확인을 해주세요.' });
      return;
    }
    if (!pwRegex.test(password)) {
      Swal.fire({ icon: 'warning', title: '형식 오류', text: '비밀번호는 8자 이상, 영문/숫자/특수문자를 포함해야 합니다.' });
      return;
    }
    if (!passwordsMatch) {
      Swal.fire({ icon: 'warning', title: '형식 오류', text: '비밀번호가 일치하지 않습니다.' });
      return;
    }
    if (!emailRegex.test(email)) {
      Swal.fire({ icon: 'warning', title: '형식 오류', text: '유효한 이메일 주소를 입력해주세요.' });
      return;
    }

    try {
      const response = await axios.post(`http://localhost:8080/api/applicant/check-id`, {
        checkString: email,
        type: "email"
      });

    } catch (error) {
      Swal.fire({ icon: 'warning', title: '형식 오류', text: '중복된 이메일 주소입니다!' });
      return; // 여기서 함수 중단 (아무것도 반환하지 않거나 특정 값 반환)
    }

    Swal.fire({
      title: '회원가입 처리 중...',
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      // 실제 백엔드 API 연동
      await axios.post(`http://localhost:8080/api/applicant/signup`, {
        userId: userId,
        password: password,
        displayName: lastName + firstName,
        email: email,
      },
        { // 3번째 인자: Config
          headers: { 'CROSS-KEY': 'my-secret-key-123' }
        });

      Swal.close();

      // 성공 알림 후 페이지 이동
      await Swal.fire({
        icon: 'success',
        title: '회원가입 성공',
        text: '가입이 완료되었습니다. 로그인 페이지로 이동합니다.'
      });

      // 4. 리다이렉트 실행
      onSignupSuccess?.(); // 부모 컴포넌트에서 정의한 로직이 있다면 실행
      navigate('/applicant/login');  // 로그인 페이지 경로로 이동 (경로가 다르면 수정하세요)

    } catch (error) {
      Swal.close();
      let msg = '회원가입 중 서버 오류가 발생했습니다.';
      if (axios.isAxiosError(error)) {
        msg = error.response?.data?.message || msg;
      }
      Swal.fire({ icon: 'error', title: '가입 실패', text: msg });
    }
  };

  const handleCancel = () => {
    navigate("/applicant/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">회원가입</h1>
          <p className="text-lg text-gray-600">
            정부 민원 포털 신규 회원가입
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User ID with Duplicate Check */}
          <div className="space-y-2">
            <Label htmlFor="userId" className="text-lg">아이디 *</Label>
            <div className="flex gap-2">
              <Input
                id="userId"
                type="text"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setIsIdAvailable(null); // Reset check when user types
                }}
                placeholder="아이디는 5~15자의 영문 소문자와 숫자로 입력해주세요."
                className="flex-1 text-lg h-12"
                required
              />
              <Button
                type="button"
                onClick={checkIdAvailability}
                variant="outline"
                className="px-6 h-12 text-base whitespace-nowrap"
                disabled={isIdChecking || !userId.trim()}
              >
                {isIdChecking ? '확인중...' : '중복확인'}
              </Button>
            </div>
            {/* ID Availability Feedback */}
            {isIdAvailable === true && (
              <p className="text-green-600 text-base flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span>사용 가능한 아이디입니다.</span>
              </p>
            )}
            {isIdAvailable === false && (
              <p className="text-red-600 text-base flex items-center gap-2">
                <X className="w-5 h-5" />
                <span>이미 사용중인 아이디입니다.</span>
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-lg">비밀번호 *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호는 8자 이상, 영문/숫자/특수문자를 포함해야 합니다."
                className="text-lg h-12 pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Password Confirm with Live Matching */}
          <div className="space-y-2">
            <Label htmlFor="passwordConfirm" className="text-lg">비밀번호 확인 *</Label>
            <div className="relative">
              <Input
                id="passwordConfirm"
                type={showPasswordConfirm ? 'text' : 'password'}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="비밀번호를 다시 입력하세요"
                className={`text-lg h-12 pr-12 transition-colors ${passwordsMatch
                  ? 'border-green-500 focus:border-green-500 bg-green-50'
                  : passwordsNoMatch
                    ? 'border-red-500 focus:border-red-500 bg-red-50'
                    : ''
                  }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswordConfirm ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {/* Password Match Feedback */}
            {passwordsMatch && (
              <p className="text-green-600 text-base flex items-center gap-2 font-medium">
                <Check className="w-5 h-5" />
                <span>비밀번호가 일치합니다.</span>
              </p>
            )}
            {passwordsNoMatch && (
              <p className="text-red-600 text-base flex items-center gap-2 font-medium">
                <X className="w-5 h-5" />
                <span>비밀번호가 일치하지 않습니다.</span>
              </p>
            )}
          </div>

          {/* Name Fields - Side by Side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-lg">성 *</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="예: 김"
                className="text-lg h-12"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-lg">이름 *</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="예: 철수"
                className="text-lg h-12"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-lg">이메일 *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="text-lg h-12"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4 space-y-3">
            <Button
              type="submit"
              className="w-full h-14 text-lg"
              disabled={!isAllInputFilled}
            >
              회원가입 완료
            </Button>

            <Button
              variant="outline"
              onClick={handleCancel}
              className="w-full h-14 text-lg"
            >
              취소
            </Button>
          </div>

          {/* Helper Text */}
          <p className="text-center text-gray-500 text-base mt-4">
            * 모든 항목은 필수 입력 항목입니다.
          </p>
        </form>
      </div>
    </div>
  );
}
