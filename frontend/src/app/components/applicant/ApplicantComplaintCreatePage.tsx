import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApplicantComplaintForm, ComplaintFormData } from './ApplicantComplaintForm';
import { ComplaintPreview } from './ComplaintPreview';
import Swal from 'sweetalert2';

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

  return (
    <div className="relative">
      {/* 화면: 민원 작성 폼 */}
      <ApplicantComplaintForm
        onGoHome={handleGoHome}
        onViewComplaints={handleViewComplaints}
        onPreview={handlePreview}
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