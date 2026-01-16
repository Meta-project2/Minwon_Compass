import React, { useEffect, useRef, useState } from 'react';

interface KakaoMapProps {
  // 민원 제출 페이지용
  address?: string;
  onLocationChange?: (lat: number, lon: number, roadAddress: string) => void;
  // 대시보드용
  complaints?: any[];
  mapView?: string;
  showSurgeOnly?: boolean;
}

const KakaoMap = ({ address, onLocationChange, complaints, mapView, showSurgeOnly }: KakaoMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [searchMarker, setSearchMarker] = useState<any>(null);
  const [clusterer, setClusterer] = useState<any>(null);
  const [dataMarkers, setDataMarkers] = useState<any[]>([]);

  // 1. 지도 초기화 (최초 1회)
  useEffect(() => {
    const kakao = (window as any).kakao;
    if (!kakao || !mapContainer.current) return;

    kakao.maps.load(() => {
      const options = {
        center: new kakao.maps.LatLng(37.5358, 127.1325), // 기본 중심지
        level: 3, // 대시보드 가독성을 위해 초기 레벨을 조금 높임
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
        minLevel: 6,
        styles: [{
          width: '50px', height: '50px',
          background: 'rgba(255, 68, 68, 0.8)',
          borderRadius: '50%',
          color: '#fff',
          textAlign: 'center',
          fontWeight: 'bold',
          lineHeight: '50px'
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

    const newMarkers = filteredData.map((item: any) => {
      return new kakao.maps.Marker({
        position: new kakao.maps.LatLng(item.lat, item.lon),
        // title: item.title // 이 줄이 에러난다면 삭제!
      });
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