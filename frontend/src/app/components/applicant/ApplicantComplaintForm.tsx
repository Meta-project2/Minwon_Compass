import { useState } from 'react';
import { Home, FileText, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from './ui/utils';

interface NewComplaintFormProps {
  onGoHome: () => void;
  onViewComplaints: () => void;
  onPreview: (data: ComplaintFormData) => void;
  onSubmit: (data: ComplaintFormData) => void;
}

export interface ComplaintFormData {
  title: string;
  body: string;
  location: string;
  incidentDate: Date;
}

export function ApplicantComplaintForm({ onGoHome, onViewComplaints, onPreview, onSubmit }: NewComplaintFormProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [location, setLocation] = useState('서울시 강남구 역삼동 123-45');
  const [incidentDate, setIncidentDate] = useState<Date>(new Date());

  const handlePreview = () => {
    const formData: ComplaintFormData = {
      title,
      body,
      location,
      incidentDate,
    };
    onPreview(formData);
  };

  const handleSubmit = () => {
    const formData: ComplaintFormData = {
      title,
      body,
      location,
      incidentDate,
    };
    onSubmit(formData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">새 민원 작성</h1>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onGoHome}
              className="flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              홈으로
            </Button>
            <Button
              variant="outline"
              onClick={onViewComplaints}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              과거 민원 보기
            </Button>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="title">민원 제목 *</Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 아파트 주변 가로등 고장" // TODO: Change placeholder text
              className="w-full"
            />
          </div>

          {/* Body Textarea */}
          <div className="space-y-2">
            <Label htmlFor="body">민원 내용 *</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="민원 내용을 상세히 작성해주세요. 예: 서초구 반포동 123-45번지 아파트 정문 앞 가로등이 2주째 작동하지 않아 야간에 보행자 안전에 위험이 있습니다. 조속한 수리를 요청드립니다." // TODO: Change placeholder text
              className="w-full min-h-[200px] resize-y"
            />
          </div>

          {/* Location with Map API Space */}
          <div className="space-y-2">
            <Label htmlFor="location">발생 장소 *</Label>
            <div className="space-y-3">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-10"
                  placeholder="주소를 입력하세요"
                />
              </div>
              
              {/* Map API Integration Space */}
              <div className="w-full h-64 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">지도 API 연동 영역</p>
                  <p className="text-gray-400 text-xs mt-1">
                    (Kakao Map 또는 Naver Map API 연동 예정)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Incident Date with Calendar */}
          <div className="space-y-2">
            <Label htmlFor="incidentDate">발생 일자 *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !incidentDate && "text-muted-foreground"
                  )}
                >
                  {incidentDate ? (
                    format(incidentDate, "PPP", { locale: ko })
                  ) : (
                    <span>날짜를 선택하세요</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={incidentDate}
                  onSelect={(date) => date && setIncidentDate(date)}
                  initialFocus
                  locale={ko}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-gray-500">
              사건이 발생한 날짜를 선택해주세요 (기본값: 오늘)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handlePreview}
              variant="outline"
              className="flex-1"
              disabled={!title || !body || !location}
            >
              미리보기
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={!title || !body || !location}
            >
              제출하기
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
