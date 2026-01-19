import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface KakaoMapProps {
  // 민원 제출 페이지용
  address?: string;
  onLocationChange?: (lat: number, lon: number, roadAddress: string) => void;
  // 대시보드용
  complaints?: any[];
  mapView?: string;
  showSurgeOnly?: boolean;
  onViewDetail: (id: string) => void;
}

const KakaoMap = ({ address, onLocationChange, complaints, mapView, showSurgeOnly, onViewDetail }: KakaoMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [searchMarker, setSearchMarker] = useState<any>(null);
  const [clusterer, setClusterer] = useState<any>(null);
  const [dataMarkers, setDataMarkers] = useState<any[]>([]);
  const navigate = useNavigate();

  // 1. 지도 초기화 (최초 1회)
  useEffect(() => {
    const kakao = (window as any).kakao;
    if (!kakao || !mapContainer.current) return;

    kakao.maps.load(() => {
      const options = {
        center: new kakao.maps.LatLng(37.5358, 127.1325), // 기본 중심지
        level: 6,
      };
      const mapInstance = new kakao.maps.Map(mapContainer.current, options);

      // 주소 검색용 마커 (제출 페이지용)
      const markerInstance = new kakao.maps.Marker({
        position: options.center,
      });
      // 제출 페이지일 때만 처음에 마커를 지도에 표시
      if (onLocationChange) markerInstance.setMap(mapInstance);

      // 클러스터러(히트맵 대용) 설정
      const clustererInstance = new kakao.maps.MarkerClusterer({
        map: mapInstance,
        averageCenter: true,
        minClusterSize: 2,
        // 클러스터에 포함된 마커 개수를 기준으로 3가지 구간
        calculator: [10, 30],
        styles: [{ // 10개 미만: 초록색
          width: '30px', height: '30px',
          background: 'rgba(52, 211, 153, 0.8)', // Tailwind emerald-400
          borderRadius: '15px', color: '#000',
          textAlign: 'center', fontWeight: 'bold', lineHeight: '31px'
        },
        { // 10~30개: 노랑색
          width: '40px', height: '40px',
          background: 'rgba(251, 191, 36, 0.8)', // Tailwind amber-400
          borderRadius: '20px', color: '#000',
          textAlign: 'center', fontWeight: 'bold', lineHeight: '41px'
        },
        { // 30개 초과: 빨간색
          width: '50px', height: '50px',
          background: 'rgba(248, 113, 113, 0.8)', // Tailwind red-400
          borderRadius: '25px', color: '#fff',
          textAlign: 'center', fontWeight: 'bold', lineHeight: '51px'
        }]
      });

      // 클릭 이벤트 등록 (제출 페이지용)
      if (onLocationChange) {
        const geocoder = new kakao.maps.services.Geocoder();
        kakao.maps.event.addListener(mapInstance, 'click', (mouseEvent: any) => {
          const latlng = mouseEvent.latLng;
          markerInstance.setPosition(latlng);
          markerInstance.setMap(mapInstance); // 클릭 시 마커 보이기

          geocoder.coord2Address(latlng.getLng(), latlng.getLat(), (result: any, status: any) => {
            if (status === kakao.maps.services.Status.OK) {
              const addr = result[0].road_address;
              const baseAddr = addr ? addr.address_name : result[0].address.address_name;

              // [수정] 건물 이름(building_name)이 있다면 주소 뒤에 추가하여 더 상세하게 만듭니다.
              const detailAddr = addr && addr.building_name
                ? `${baseAddr} (${addr.building_name})`
                : baseAddr;

              onLocationChange(latlng.getLat(), latlng.getLng(), detailAddr);
            }
          });
        });
      }

      setMap(mapInstance);
      setSearchMarker(markerInstance);
      setClusterer(clustererInstance);
    });
  }, []);

  // 2. 주소 검색어 입력 시 이동 (제출 페이지용)
  useEffect(() => {
    const kakao = (window as any).kakao;
    if (map && address && searchMarker) {
      const geocoder = new kakao.maps.services.Geocoder();
      geocoder.addressSearch(address, (result: any, status: any) => {
        if (status === kakao.maps.services.Status.OK) {
          const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
          map.setCenter(coords);
          searchMarker.setPosition(coords);
          searchMarker.setMap(map);
        }
      });
    }
  }, [address, map, searchMarker]);

  // 3. 대시보드 데이터 바인딩 (히트맵/마커 모드)
  useEffect(() => {
    if (!map || !clusterer || !complaints) return;

    const kakao = (window as any).kakao;

    // 기존 마커 및 클러스터 초기화
    clusterer.clear();
    dataMarkers.forEach(m => m.setMap(null));

    // 급증 필터링 로직 (데이터에 surge 속성이 있다고 가정)
    const filteredData = showSurgeOnly
      ? complaints.filter(c => c.isSurge === true)
      : complaints;

    // 정보창(InfoWindow) 객체 생성
    const infowindow = new kakao.maps.InfoWindow({ zIndex: 1 });

    const newMarkers = filteredData.map((item: any) => {
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(item.lat, item.lon),
        clickable: true
      });

      kakao.maps.event.addListener(marker, 'mouseover', () => {
        infowindow.setContent(`
                <div style="padding:5px;font-size:12px;min-width:150px;">
                    <div style="font-weight:bold;margin-bottom:3px;">${item.title}</div>
                    <div style="color:#666;">상태: ${item.status}</div>
                    <div>접수일자: ${new Date(item.createdAt).toLocaleDateString()}</div>
                </div>
            `);
        infowindow.open(map, marker);
      });

      // [마우스 뗐을 때] 정보창 닫기
      kakao.maps.event.addListener(marker, 'mouseout', () => {
        infowindow.close();
      });

      // [클릭했을 때] 해당 상세 페이지로 이동
      kakao.maps.event.addListener(marker, 'click', () => {
        onViewDetail(String(item.id));
      });

      return marker;
    });

    if (mapView === 'heatmap') {
      clusterer.addMarkers(newMarkers);
    } else {
      newMarkers.forEach(m => m.setMap(map));
    }

    setDataMarkers(newMarkers);

    // 대시보드 모드일 때는 주소 검색용 핀은 숨김
    if (complaints.length > 0 && searchMarker) {
      searchMarker.setMap(null);
    }

  }, [complaints, map, clusterer, mapView, showSurgeOnly]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full min-h-[300px]"
      style={{ borderRadius: '8px' }}
    />
  );
};

export default KakaoMap;