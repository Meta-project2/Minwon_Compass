import React, { useState, useEffect } from 'react';
import KakaoMap from './applicant/KakaoMap'; // 경로 확인 필요
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ComplaintDetailPage } from './ComplaintDetailPage';

const HeatmapPage = () => {
    const [complaints, setComplaints] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);

    console.log("1. HeatmapPage 렌더링됨");

    // 1. 강동구 중심 데이터 로드
    useEffect(() => {
        console.log("2. useEffect 실행됨 (데이터 로드 시작)");
        const fetchHeatmapData = async () => {
            try {
                setIsLoading(true);
                // 백엔드에서 위경도(lat, lon)가 포함된 민원 목록을 가져옵니다.
                const response = await axios.get('/api/applicant/heatmap');
                console.log("3. 데이터 수신 성공:", response.data);
                setComplaints(response.data);
            } catch (error) {
                console.error("데이터 로드 실패:", error);
            } finally {
                console.log("4. 로딩 상태 종료");
                setIsLoading(false);
            }
        };
        fetchHeatmapData();
    }, []);

    const handleViewDetail = (id: string) => {
        setSelectedComplaintId(id);
    };

    // [추가] 동료의 방식: 상세 ID가 있으면 상세 페이지를 먼저 리턴
    if (selectedComplaintId) {
        return (
            <ComplaintDetailPage 
                complaintId={selectedComplaintId} 
                onBack={() => setSelectedComplaintId(null)} 
            />
        );
    }

    return (
        // 페이지 전체를 차지하는 컨테이너
        <div className="w-full h-full bg-gray-100 flex flex-col overflow-hidden relative">

            {/* (선택사항) 지도 위 플로팅 타이틀이나 필터 바 */}
            <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur shadow-lg rounded-2xl p-4 border border-gray-200">
                <h1 className="text-xl font-bold text-gray-800">강동구 민원 밀집도 분석</h1>
                <p className="text-sm text-gray-500">실시간 클러스터링 기반 히트맵</p>
            </div>

            {/* 지도 영역: 부모의 남은 공간을 100% 채움 */}
            <div className="flex-1 w-full h-full relative">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <>
                        {console.log("7. KakaoMap에 넘기는 데이터:", complaints)}
                        <KakaoMap
                            complaints={complaints}
                            mapView="heatmap"
                            onViewDetail={handleViewDetail} // 여기서 ID를 받아 setSelectedComplaintId 실행
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default HeatmapPage;