import React, { useEffect, useRef, useState } from 'react';

const KakaoMap = ({ address }: { address: string }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);

  useEffect(() => {
    // 1. 지도 초기화
    const kakao = (window as any).kakao;
    if (!kakao) return;

    kakao.maps.load(() => {
      const options = {
        center: new kakao.maps.LatLng(37.5665, 126.9780), // 서울시청 기준
        level: 3
      };
      const mapInstance = new kakao.maps.Map(mapContainer.current, options);
      const markerInstance = new kakao.maps.Marker({
        position: options.center
      });
      
      markerInstance.setMap(mapInstance);
      setMap(mapInstance);
      setMarker(markerInstance);
    });
  }, []);

  useEffect(() => {
    // 2. 주소가 바뀔 때마다 해당 위치로 이동 및 마커 표시
    const kakao = (window as any).kakao;
    if (map && address) {
      const geocoder = new kakao.maps.services.Geocoder();
      geocoder.addressSearch(address, (result: any, status: any) => {
        if (status === kakao.maps.services.Status.OK) {
          const coords = new kakao.maps.LatLng(result[0].y, result[0].x);
          map.setCenter(coords);
          marker.setPosition(coords);
        }
      });
    }
  }, [address, map, marker]);

  return <div ref={mapContainer} className="w-full h-full rounded-lg" />;
};

export default KakaoMap;