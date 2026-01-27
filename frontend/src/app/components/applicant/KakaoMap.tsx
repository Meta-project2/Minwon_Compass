import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';


const statusMap: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: '접수', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  RECOMMENDED: { label: '이관 요청', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  IN_PROGRESS: { label: '처리중', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  RESOLVED: { label: '답변완료', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  CLOSED: { label: '종결', color: 'bg-slate-100 text-slate-600 border-slate-300' },
  CANCELED: { label: '취하', color: 'bg-red-100 text-pink-600 border-red-300' }
};

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

  useEffect(() => {
    const kakao = (window as any).kakao;
    if (!kakao || !mapContainer.current) return;

    kakao.maps.load(() => {
      const options = {
        center: new kakao.maps.LatLng(37.5301, 127.1238),
        level: 5,
      };
      const mapInstance = new kakao.maps.Map(mapContainer.current, options);
      const markerInstance = new kakao.maps.Marker({
        position: options.center,
      });
      if (onLocationChange) markerInstance.setMap(mapInstance);

      const clustererInstance = new kakao.maps.MarkerClusterer({
        map: mapInstance,
        averageCenter: true,
        minClusterSize: 2,

        calculator: [10, 30],
        styles: [{ // 10개 미만: 초록색
          width: '30px', height: '30px',
          background: 'rgba(52, 211, 153, 0.8)',
          borderRadius: '15px', color: '#000',
          textAlign: 'center', fontWeight: 'bold', lineHeight: '31px'
        },
        { // 10~30개: 노랑색
          width: '40px', height: '40px',
          background: 'rgba(251, 191, 36, 0.8)',
          borderRadius: '20px', color: '#000',
          textAlign: 'center', fontWeight: 'bold', lineHeight: '41px'
        },
        { // 30개 초과: 빨간색
          width: '50px', height: '50px',
          background: 'rgba(248, 113, 113, 0.8)',
          borderRadius: '25px', color: '#fff',
          textAlign: 'center', fontWeight: 'bold', lineHeight: '51px'
        }]
      });

      if (onLocationChange) {
        const geocoder = new kakao.maps.services.Geocoder();
        kakao.maps.event.addListener(mapInstance, 'click', (mouseEvent: any) => {
          const latlng = mouseEvent.latLng;
          markerInstance.setPosition(latlng);
          markerInstance.setMap(mapInstance);

          geocoder.coord2Address(latlng.getLng(), latlng.getLat(), (result: any, status: any) => {
            if (status === kakao.maps.services.Status.OK) {
              const addr = result[0].road_address;
              const baseAddr = addr ? addr.address_name : result[0].address.address_name;
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

  useEffect(() => {
    if (!map || !clusterer || !complaints) return;
    const kakao = (window as any).kakao;

    clusterer.clear();
    dataMarkers.forEach(m => m.setMap(null));

    const filteredData = showSurgeOnly
      ? complaints.filter(c => c.isSurge === true)
      : complaints;

    const infowindow = new kakao.maps.InfoWindow({ zIndex: 1 });

    const newMarkers = filteredData.map((item: any) => {
      const marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(item.lat, item.lon),
        clickable: true
      });

      const currentStatus = statusMap[item.status] || { label: item.status, color: 'bg-gray-100 text-gray-700' };

      kakao.maps.event.addListener(marker, 'mouseover', () => {
        infowindow.setContent(`
        <div style="padding:15px; font-size:13px; min-width:220px; border-radius:12px; line-height:1.6; border:none; background:white;">
            <div style="font-weight:bold; margin-bottom:8px; color:#1a1a1a; font-size:14px;">
                ${item.title}
            </div>
            <div style="color:#666; display:flex; justify-content:space-between; align-items:center;">
                <span>상태</span>
                <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold border ${currentStatus.color}">
                    ${currentStatus.label}
                </span>
            </div>
            <div style="color:#666; display:flex; justify-content:space-between; margin-top:4px;">
                <span>접수일자</span>
                <span style="color:#333;">${new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
        </div>
    `);
        infowindow.open(map, marker);
      });

      kakao.maps.event.addListener(marker, 'mouseout', () => {
        infowindow.close();
      });
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