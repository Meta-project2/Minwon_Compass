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
import KakaoMap from './KakaoMap';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import api from './AxiosInterface';
import { Toolbar } from './toolbar';

interface NewComplaintFormProps {
  onGoHome: () => void;
  onViewComplaints: () => void;
  onPreview: (data: ComplaintFormData) => void;
}

export interface ComplaintFormData {
  title: string;
  body: string;
  location: string;
  incidentDate: Date;
}

export function ApplicantComplaintForm({ onPreview }: NewComplaintFormProps) {

  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken');

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [location, setLocation] = useState('서울특별시 강동구 성내로 25');
  const [incidentDate, setIncidentDate] = useState<Date>(new Date());
  // 위치 정보를 저장하기 위한 상태
  const [geoData, setGeoData] = useState({ lat: 0, lon: 0, roadAddress: '' });

  // 지도의 위치가 바뀔 때 실행될 함수
  const handleLocationChange = (lat: number, lon: number, roadAddress: string) => {
    // 1. 위도, 경도, 도로명 주소를 객체에 저장 (전송용)
    setGeoData({ lat, lon, roadAddress });

    // 2. 상단 Input 창에 표시되는 주소 텍스트를 마커 위치의 주소로 자동 업데이트!
    setLocation(roadAddress);
  };

  const handleSubmit = async () => {
    // 백엔드로 보낼 데이터 (DTO 구조)
    const submitData = {
      title,
      body,
      addressText: geoData.roadAddress || location,
      lat: geoData.lat,
      lon: geoData.lon,
    };

    Swal.fire({
      title: '민원을 제출하시겠습니까?',
      html: `<b>확인된 위치:</b><br/>${submitData.addressText}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '제출하기',
      cancelButtonText: '취소',
      confirmButtonColor: '#1677d3',
      cancelButtonColor: 'rgb(230, 190, 61)',
    }).then((result) => {
      if (result.isConfirmed) {
        let timerInterval: ReturnType<typeof setInterval> | undefined;
        const messages = [
          "AI가 민원 내용을 정밀 분석 중입니다...",
          "유사한 과거 민원 사례를 검색하고 있습니다...",
          "최적의 처리 부서를 매칭하는 중입니다...",
          "민원 처리 효율을 위해 데이터를 정제하고 있습니다..."
        ];

        // 1. 안내 알림창 띄우기 (로딩 + 확인 버튼 포함)
        Swal.fire({
          title: messages[0],
          html: `
        <div style="margin-bottom: 10px;">잠시만 기다려 주세요. (예상 소요 시간: 30초~1분)</div>
        <div style="font-size: 0.9em; color: #666;">이 창을 닫아도 분석은 백그라운드에서 계속 진행됩니다.</div>
      `,
          icon: 'info',
          allowOutsideClick: true,  // 바깥 클릭 시 닫기 허용
          showConfirmButton: true,  // 확인 버튼 표시
          confirmButtonText: '확인 (백그라운드 진행)',
          didOpen: () => {
            Swal.showLoading(Swal.getConfirmButton()); // 로딩 스피너 표시
            let i = 0;
            timerInterval = setInterval(() => {
              i = (i + 1) % messages.length;
              Swal.update({ title: messages[i] });
            }, 5000);
          },
          willClose: () => clearInterval(timerInterval)
        });

        // 2. API 호출 (await를 사용하지 않고 바로 실행)
        api.post('applicant/complaint', submitData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
          .then(() => {
            // 성공 시: 이미 창이 닫혀있을 수도 있으므로 토스트 알림이나 조용한 알림 권장
            console.log("백그라운드 접수 완료");
            // 만약 창이 아직 열려있다면 성공 화면으로 전환 가능
            if (Swal.isVisible()) {
              Swal.fire({
                title: '접수 완료!',
                text: 'AI 분석을 거쳐 최적의 부서로 전달되었습니다.',
                icon: 'success',
                confirmButtonText: '메인으로 이동'
              }).then(() => navigate('/applicant/main'));
            }
          })
          .catch((error) => {
            console.error("접수 실패:", error);
            if (Swal.isVisible()) {
              Swal.fire('오류 발생', '전송 중 에러가 발생했습니다.', 'error');
            }
          });
      }
    });
  };

  const handlePreview = () => {
    const formData: ComplaintFormData = {
      title,
      body,
      location,
      incidentDate,
    };
    onPreview(formData);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden font-sans">
      {/* 통합 툴바 사용 */}
      <Toolbar subTitle="민원 작성" />

      {/* [본문 컨텐츠] 툴바를 제외한 나머지 높이 전체 사용 */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto px-10 py-6 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 h-full">

          {/* [좌측 섹션] 민원 내용 입력 */}
          <section className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-6 shrink-0">
              <span className="text-lg">✍️</span>
              <h3 className="text-lg font-bold text-gray-800">민원 내용 입력</h3>
            </div>

            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              {/* 제목 입력 */}
              <div className="space-y-2 shrink-0">
                <div className="flex justify-between items-center">
                  <Label htmlFor="title" className="text-sm font-bold text-gray-700">민원 제목 <span className="text-red-500">*</span></Label>
                  <span className={cn("text-[11px] px-2 py-0.5 rounded-full bg-gray-50", title.length >= 200 ? "text-red-500 font-bold bg-red-50" : "text-gray-400")}>
                    {title.length} / 200
                  </span>
                </div>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 200))}
                  placeholder="어떤 불편함이 있으신가요?"
                  className="h-12 border-gray-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition-all px-4"
                />
              </div>

              {/* 본문 입력: flex-1과 min-h-0으로 남은 공간 모두 차지 */}
              <div className="flex-1 flex flex-col space-y-2 min-h-0">
                <div className="flex justify-between items-center">
                  <Label htmlFor="body" className="text-sm font-bold text-gray-700">민원 상세 내용 <span className="text-red-500">*</span></Label>
                  <span className={cn("text-[11px] px-2 py-0.5 rounded-full bg-gray-50", body.length >= 40000 ? "text-red-500 font-bold bg-red-50" : "text-gray-400")}>
                    {body.length.toLocaleString()} / 40,000
                  </span>
                </div>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 40000))}
                  placeholder="민원 내용을 상세히 작성해주세요."
                  className="flex-1 border-gray-200 rounded-2xl focus:ring-blue-500 focus:border-blue-500 transition-all p-5 leading-relaxed resize-none"
                />
              </div>
            </div>
          </section>

          {/* [우측 섹션] 지도 및 버튼 통합 */}
          <section className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-6 shrink-0">
              <span className="text-lg">📍</span>
              <h3 className="text-lg font-bold text-gray-800">발생 장소 및 제출</h3>
            </div>

            <div className="flex-1 flex flex-col space-y-4 min-h-0">
              {/* 주소 입력 */}
              <div className="space-y-2 shrink-0">
                <Label className="text-xs font-bold text-gray-500 uppercase px-1">상세 주소</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="pl-10 h-11 border-gray-200 rounded-xl text-sm bg-gray-50/50 focus:bg-white"
                    placeholder="지도의 마커를 움직여 위치를 지정하세요"
                  />
                </div>
              </div>

              {/* 지도 영역: flex-1과 min-h-0으로 버튼 영역을 제외한 모든 공간 차지 */}
              <div className="flex-1 rounded-[24px] border border-gray-100 overflow-hidden shadow-inner relative min-h-0">
                <KakaoMap address={location} onLocationChange={handleLocationChange} onViewDetail={function (id: string): void {
                  throw new Error('Function not implemented.');
                }} />
              </div>

              {/* 액션 버튼 영역: 하단 고정 */}
              <div className="pt-4 shrink-0">
                <div className="flex gap-4">
                  <Button
                    onClick={handlePreview}
                    variant="outline"
                    className="flex-1 h-14 rounded-2xl font-bold text-gray-600 border-gray-200 hover:bg-gray-50 transition-all"
                    disabled={!title || !body || !location}
                  >
                    미리보기
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="flex-1 h-14 rounded-2xl font-bold bg-gray-900 hover:bg-gray-800 text-white shadow-lg transition-all active:scale-[0.98]"
                    disabled={!title || !body || !location}
                  >
                    민원 제출하기
                  </Button>
                </div>
                <p className="text-center text-[11px] text-gray-400 mt-3">
                  * 필수 항목(*)을 모두 입력해야 제출이 가능합니다.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

