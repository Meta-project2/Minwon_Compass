import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApplicantComplaintForm, ComplaintFormData } from './ApplicantComplaintForm';
import { ComplaintPreview } from './ComplaintPreview';

export default function ApplicantComplaintCreatePage() {
  const navigate = useNavigate();
  
  // 1. 미리보기 모달 및 데이터 상태 관리
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<ComplaintFormData | null>(null);

  // 2. 홈으로 이동
  const handleGoHome = () => navigate('/applicant/main');

  // 3. 목록으로 이동
  const handleViewComplaints = () => navigate('/applicant/complaint');

  // 4. 미리보기 버튼 클릭 시
  const handlePreview = (data: ComplaintFormData) => {
    setPreviewData(data);
    setIsPreviewOpen(true);
  };

  // 5. 실제 제출 처리
  const handleSubmit = (data: ComplaintFormData) => {
    console.log("서버로 민원 제출:", data);
    // TODO: 여기에 axios 또는 fetch를 이용한 API 통신 코드를 작성하세요.
    alert("민원이 성공적으로 제출되었습니다.");
    navigate('/applicant/complaint');
  };

  return (
    <div className="relative">
      {/* 화면: 민원 작성 폼 */}
      <ApplicantComplaintForm
        onGoHome={handleGoHome}
        onViewComplaints={handleViewComplaints}
        onPreview={handlePreview}
        onSubmit={handleSubmit}
      />

      {/* 모달: 미리보기 창 (상태가 true일 때만 표시) */}
      {isPreviewOpen && previewData && (
        <ComplaintPreview 
          data={previewData} 
          onClose={() => setIsPreviewOpen(false)} 
        />
      )}
    </div>
  );
}