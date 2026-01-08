import psycopg2
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from datetime import timedelta
import math
from tqdm import tqdm

# --- 설정값 (기준) ---
SIMILARITY_THRESHOLD = 0.80  # 유사도 80% 이상
DISTANCE_THRESHOLD_M = 200   # 반경 200m 이내
TIME_THRESHOLD_DAYS = 7      # 7일 이내 발생

DB_CONFIG = {
    "host": "localhost",
    "database": "complaint_db",
    "user": "postgres",
    "password": "0000",
    "port": "5432"
}

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

# 하버사인(Haversine) 거리 계산 함수 (위도, 경도 -> 미터)
def calculate_distance(lat1, lon1, lat2, lon2):
    if None in [lat1, lon1, lat2, lon2]: return float('inf')
    R = 6371000  # 지구 반지름 (미터)
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2) * math.sin(dlambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def fetch_unassigned_complaints(conn):
    """사건(incident_id)이 없는 민원과 임베딩 벡터를 가져옴"""
    cursor = conn.cursor()
    # 좌표(lat, lon)가 있는 데이터만 대상
    sql = """
        SELECT 
            c.id, c.title, c.received_at, c.lat, c.lon, c.district_id,
            n.embedding
        FROM complaints c
        JOIN complaint_normalizations n ON c.id = n.complaint_id
        WHERE c.incident_id IS NULL
          AND c.lat IS NOT NULL 
          AND c.lon IS NOT NULL
        ORDER BY c.received_at DESC;
    """
    cursor.execute(sql)
    rows = cursor.fetchall()
    
    complaints = []
    for r in rows:
        # embedding 문자열을 numpy array로 변환
        emb_str = r[6].replace('[', '').replace(']', '')
        emb_vec = np.array([float(x) for x in emb_str.split(',')])
        
        complaints.append({
            "id": r[0],
            "title": r[1],
            "date": r[2],
            "lat": float(r[3]),
            "lon": float(r[4]),
            "district_id": r[5],
            "embedding": emb_vec
        })
    return complaints

def create_incidents(conn, complaints):
    """Greedy Clustering 알고리즘으로 사건 생성"""
    cursor = conn.cursor()
    visited_ids = set()
    clusters_created = 0

    print(f"[*] 군집화 시작 (대상 민원: {len(complaints)}건)")
    
    # 진행률 표시
    for i in tqdm(range(len(complaints))):
        pivot = complaints[i]
        
        # 이미 다른 사건에 묶인 민원은 패스
        if pivot['id'] in visited_ids:
            continue
            
        visited_ids.add(pivot['id'])
        
        # 군집 후보 찾기 (Pivot과 유사한 민원들)
        cluster_members = [pivot]
        
        for j in range(i + 1, len(complaints)):
            candidate = complaints[j]
            if candidate['id'] in visited_ids:
                continue

            # 1. 지역 필터 (같은 구여야 함 - 처리 효율성)
            if pivot['district_id'] != candidate['district_id']:
                continue

            # 2. 시간 필터 (7일 이내)
            time_diff = abs((pivot['date'] - candidate['date']).days)
            if time_diff > TIME_THRESHOLD_DAYS:
                continue # 정렬되어 있으므로 더 먼 과거는 볼 필요 없음 (break 가능하지만 안전하게 continue)

            # 3. 거리 필터 (200m 이내)
            dist = calculate_distance(pivot['lat'], pivot['lon'], candidate['lat'], candidate['lon'])
            if dist > DISTANCE_THRESHOLD_M:
                continue

            # 4. 내용 유사도 필터 (벡터 코사인 유사도)
            # reshape(1, -1)은 2차원 배열로 만듦
            sim = cosine_similarity(pivot['embedding'].reshape(1, -1), 
                                    candidate['embedding'].reshape(1, -1))[0][0]
            
            if sim >= SIMILARITY_THRESHOLD:
                cluster_members.append(candidate)
                visited_ids.add(candidate['id'])

        # --- 군집 형성 조건: 멤버가 2명 이상이면 '사건' 생성 ---
        if len(cluster_members) >= 2:
            # 사건 제목 생성 (가장 최신 민원의 제목 + "관련 유사 민원")
            incident_title = f"[{pivot['title']}] 관련 반복 민원"
            
            # 중심 좌표(Centroid) 계산
            avg_lat = np.mean([m['lat'] for m in cluster_members])
            avg_lon = np.mean([m['lon'] for m in cluster_members])
            
            # incidents 테이블에 사건 생성
            cursor.execute("""
                INSERT INTO incidents (title, district_id, centroid_lat, centroid_lon, status, opened_at)
                VALUES (%s, %s, %s, %s, 'OPEN', NOW())
                RETURNING id;
            """, (incident_title, pivot['district_id'], avg_lat, avg_lon))
            
            new_incident_id = cursor.fetchone()[0]
            
            # complaints 테이블 업데이트 (민원들을 이 사건에 소속시킴)
            member_ids = [m['id'] for m in cluster_members]
            
            # 유사도 점수는 Pivot과의 유사도로 대략 기록 (본인끼리는 1.0)
            for m in cluster_members:
                sim_score = 1.0 if m['id'] == pivot['id'] else cosine_similarity(
                    pivot['embedding'].reshape(1, -1), m['embedding'].reshape(1, -1)
                )[0][0]
                
                cursor.execute("""
                    UPDATE complaints 
                    SET incident_id = %s, incident_linked_at = NOW(), incident_link_score = %s
                    WHERE id = %s
                """, (new_incident_id, float(sim_score), m['id']))
            
            clusters_created += 1
            # print(f"  [+] 사건 생성(ID: {new_incident_id}): 총 {len(cluster_members)}건 묶음")

    conn.commit()
    print(f"\n[결과] 총 {clusters_created}개의 새로운 사건(Incident)이 생성되었습니다.")

if __name__ == "__main__":
    conn = get_db_connection()
    try:
        data = fetch_unassigned_complaints(conn)
        if not data:
            print("[!] 군집화할 대상(incident_id IS NULL) 민원이 없습니다.")
        else:
            create_incidents(conn, data)
    finally:
        conn.close()