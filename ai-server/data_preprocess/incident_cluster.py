import psycopg2
import pandas as pd
import numpy as np
import json
import ast
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import cosine_distances
from collections import Counter
from datetime import datetime

# ==========================================
# 1. DB 설정
# ==========================================
DB_CONFIG = {
    "host": "localhost",
    "dbname": "postgres",
    "user": "postgres",
    "password": "sanghpw", 
    "port": "5432"
}

# ==========================================
# 2. 데이터 파싱 유틸리티
# ==========================================
def parse_vector(val):
    if isinstance(val, str):
        try: return np.array(json.loads(val))
        except: return np.zeros(768)
    return np.array(val) if val is not None else np.zeros(768)

def parse_keywords(val):
    if not val: return set()
    raw_set = set()
    if isinstance(val, str):
        try: raw_set = set(json.loads(val))
        except: 
            try: raw_set = set(ast.literal_eval(val))
            except: raw_set = set()
    else:
        raw_set = set(val)
    return {word for word in raw_set if len(word) > 1}

# ==========================================
# 3. 거리 계산 로직 (하이브리드)
# ==========================================
def calculate_hybrid_distance(vec1, vec2, kws1, kws2):
    # 1. 의미 거리 (Cosine)
    sem_dist = cosine_distances([vec1], [vec2])[0][0]
    
    # 2. 키워드 거리 (Jaccard)
    if not kws1 and not kws2: key_dist = 0.5
    elif not kws1 or not kws2: key_dist = 1.0
    else:
        intersection = len(kws1.intersection(kws2))
        union = len(kws1.union(kws2))
        key_dist = 1.0 - (intersection / union if union > 0 else 0)
        
    return (sem_dist * 0.7) + (key_dist * 0.3)

def calculate_jaccard_matrix(keywords_list):
    """DBSCAN용 매트릭스 계산 (누락되었던 함수 복구)"""
    n = len(keywords_list)
    dist_matrix = np.ones((n, n))
    for i in range(n):
        for j in range(i, n):
            set1 = keywords_list[i]
            set2 = keywords_list[j]
            if not set1 and not set2: dist = 0.5
            elif not set1 or not set2: dist = 1.0 
            else:
                inter = len(set1.intersection(set2))
                union = len(set1.union(set2))
                dist = 1.0 - (inter / union if union else 0)
            dist_matrix[i, j] = dist
            dist_matrix[j, i] = dist
    return dist_matrix

# ==========================================
# 4. 타이틀 및 키워드 생성
# ==========================================
def generate_title_only(group):
    sorted_group = group.sort_values('received_at')
    raw_summary = sorted_group.iloc[0]['core_request']
    return raw_summary.replace('\n', ' ').strip() if raw_summary else "요약 정보 없음"

def get_representative_keyword(keywords_list):
    all_kws = [kw for sub in keywords_list for kw in sub]
    if not all_kws: return "민원"
    top_kw = Counter(all_kws).most_common(1)[0][0]
    return str(top_kw).replace('[','').replace(']','').replace("'","").strip()

# ==========================================
# 5. 메인 로직: 증분 업데이트 (Anchoring & Global Clustering)
# ==========================================
def run_incremental_clustering():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    print(f"🚀 [Upgrade] 부서 통합 & 중심점 고정(Anchoring) 로직 시작 ({datetime.now()})")

    # 1. 활성 사건 로드
    sql_active = """
        SELECT c.incident_id, n.embedding, n.keywords_jsonb
        FROM complaints c
        JOIN complaint_normalizations n ON c.id = n.complaint_id
        WHERE c.incident_id IS NOT NULL AND c.status != 'CLOSED' 
    """
    active_df = pd.read_sql(sql_active, conn)
    active_df['vec'] = active_df['embedding'].apply(parse_vector)
    active_df['kws'] = active_df['keywords_jsonb'].apply(parse_keywords)
    
    incident_centroids = {}
    if not active_df.empty:
        for iid, group in active_df.groupby('incident_id'):
            # 현재의 중심점 계산
            mean_vec = np.mean(np.stack(group['vec'].values), axis=0)
            all_kws = set().union(*group['kws'].tolist())
            # [솔루션 2] 부서 정보 제거 (Global)
            incident_centroids[iid] = {'vec': mean_vec, 'kws': all_kws, 'count': len(group)}
            
    print(f"   👉 활성화된 사건 {len(incident_centroids)}개 로드 완료.")

    # 2. 신규 민원 로드
    sql_new = """
        SELECT c.id, c.created_at as received_at, n.embedding, n.keywords_jsonb, n.core_request
        FROM complaints c
        JOIN complaint_normalizations n ON c.id = n.complaint_id
        WHERE c.incident_id IS NULL AND n.embedding IS NOT NULL
    """
    new_df = pd.read_sql(sql_new, conn)
    if new_df.empty:
        print("🎉 신규 민원 없음. 종료.")
        conn.close(); return

    new_df['vec'] = new_df['embedding'].apply(parse_vector)
    new_df['kws'] = new_df['keywords_jsonb'].apply(parse_keywords)

    print(f"   👉 신규 민원 {len(new_df)}건 처리 시작 (부서 구분 없음)")

    # 3. 매칭 및 중심점 고정 (Anchoring)
    assigned_count = 0
    unassigned_indices = []
    MATCH_THRESHOLD = 0.15 

    for idx, row in new_df.iterrows():
        vec = row['vec']
        kws = row['kws']
        
        best_match_id = None
        min_dist = 1.0
        
        # [솔루션 2] 모든 사건과 비교
        for iid, info in incident_centroids.items():
            dist = calculate_hybrid_distance(vec, info['vec'], kws, info['kws'])
            if dist < min_dist:
                min_dist = dist
                best_match_id = iid
        
        if best_match_id and min_dist <= MATCH_THRESHOLD:
            # DB 업데이트
            cur.execute("UPDATE complaints SET incident_id = %s WHERE id = %s", (best_match_id, row['id']))
            cur.execute("""
                UPDATE incidents 
                SET complaint_count = complaint_count + 1, last_occurred = GREATEST(last_occurred, %s)
                WHERE id = %s
            """, (row['received_at'], best_match_id))
            
            # [솔루션 1] Anchoring: 10개 미만일 때만 학습, 그 뒤론 고정
            current_count = incident_centroids[best_match_id]['count']
            
            if current_count < 10:
                prev_vec = incident_centroids[best_match_id]['vec']
                new_n = current_count + 1
                new_vec = (prev_vec * current_count + vec) / new_n
                
                incident_centroids[best_match_id]['vec'] = new_vec
                incident_centroids[best_match_id]['count'] = new_n
            else:
                incident_centroids[best_match_id]['count'] += 1
                
            assigned_count += 1
        else:
            unassigned_indices.append(idx)
            
    conn.commit()

    # 4. 신규 사건 생성 (Global DBSCAN)
    remaining_df = new_df.loc[unassigned_indices].copy()
    new_incidents_count = 0

    if not remaining_df.empty:
        # [솔루션 2] groupby 제거 -> 전체 군집화
        vectors = np.stack(remaining_df['vec'].values)
        sem_dist = cosine_distances(vectors)
        
        # [수정] 누락되었던 함수 호출 복구
        kws_list = remaining_df['kws'].tolist()
        key_dist = calculate_jaccard_matrix(kws_list)
        
        final_dist = (sem_dist * 0.7) + (key_dist * 0.3)
        
        dbscan = DBSCAN(eps=0.13, min_samples=1, metric='precomputed')
        labels = dbscan.fit_predict(final_dist)
        
        remaining_df['cluster_label'] = labels
        
        for label in set(labels):
            if label == -1: continue
            cluster = remaining_df[remaining_df['cluster_label'] == label]
            
            title = generate_title_only(cluster)
            rep_kw = get_representative_keyword(cluster['kws'].tolist())
            kw_json = json.dumps([rep_kw])
            
            cur.execute("""
                INSERT INTO incidents (title, status, complaint_count, opened_at, closed_at, keywords)
                VALUES (%s, 'OPEN', %s, %s, %s, %s) RETURNING id
            """, (title, len(cluster), cluster['received_at'].min(), cluster['received_at'].max(), kw_json))
            
            new_iid = cur.fetchone()[0]
            ids = tuple(cluster['id'].tolist())
            cur.execute(f"UPDATE complaints SET incident_id = %s WHERE id IN %s", (new_iid, ids))
            new_incidents_count += 1
            
        conn.commit()

    cur.close(); conn.close()
    print(f"\n✅ [완료] 병합: {assigned_count}건 / 신규 생성: {new_incidents_count}개")

if __name__ == "__main__":
    run_incremental_clustering()