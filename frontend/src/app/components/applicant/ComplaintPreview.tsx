import { X, Calendar, MapPin, User, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ComplaintFormData } from './ApplicantComplaintForm';

interface ComplaintPreviewProps {
  data: ComplaintFormData;
  onClose: () => void;
}

export function ComplaintPreview({ data, onClose }: ComplaintPreviewProps) {
  const currentDate = new Date();
  const complaintId = `C${currentDate.getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            <h2 className="text-lg font-semibold">민원 미리보기</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-blue-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Complaint Info Header */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">민원 번호</span>
                <span className="font-mono font-semibold text-blue-600">{complaintId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">제출일</span>
                <span className="font-medium">{format(currentDate, 'yyyy년 MM월 dd일', { locale: ko })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">상태</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  접수 대기
                </span>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">제목</h3>
              <p className="text-xl font-semibold text-gray-900">{data.title}</p>
            </div>

            {/* Incident Date */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-500">발생 일자</h3>
              </div>
              <p className="text-gray-900">{format(data.incidentDate, 'yyyy년 MM월 dd일 (EEEE)', { locale: ko })}</p>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-500">발생 장소</h3>
              </div>
              <p className="text-gray-900">{data.location}</p>
            </div>

            {/* Body */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">민원 내용</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">{data.body}</p>
              </div>
            </div>

            {/* Applicant Info (Mock) */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-500">신청인 정보</h3>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">이름</span>
                  <span className="text-gray-900">홍길동</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">연락처</span>
                  <span className="text-gray-900">010-****-****</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              이 미리보기는 실제 제출되는 민원의 형태를 보여줍니다.
            </p>
            <Button onClick={onClose} variant="outline">
              닫기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
