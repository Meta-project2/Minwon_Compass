import psycopg2
import pandas as pd
import numpy as np
import json
import ast
import re
from datetime import datetime
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import cosine_distances
from collections import Counter

# DB 설정
DB_CONFIG = { "host": "localhost", "dbname": "complaint_db", "user": "postgres", "password": "0000", "port": "5432" }

def parse_vector(val):
    if isinstance(val, str):
        try: return np.array(json.loads(val))
        except: return np.zeros(1024)
    return np.array(val) if val is not None else np.zeros(1024)

def parse_keywords(val):
    if not val: return set()
    raw_set = set()
    if isinstance(val, str):
        try: raw_set = set(json.loads(val))
        except: 
            try: raw_set = set(ast.literal_eval(val))
            except: raw_set = set()
    else: raw_set = set(val)
    
    # [수정] 한글 2글자 이상만 남기고, 영어/특수문자 제거 (Environment 같은거 제거)
    cleaned_set = set()
    for word in raw_set:
        # 한글만 추출
        korean_word = re.sub('[^가-힣]', '', word)
        if len(korean_word) >= 2:
            cleaned_set.add(korean_word)
            
    return cleaned_set

def get_representative_keyword(keywords_list):
    all_kws = [kw for sub in keywords_list for kw in sub]
    if not all_kws: return "민원"
    top_kw = Counter(all_kws).most_common(1)[0][0]
    return str(top_kw).strip()

# [핵심] 스마트 제목 생성 (중복 회피 로직 추가)
def generate_unique_smart_title(group, centroid_vec, existing_titles):
    """
    제목을 만들고 existing_titles(이미 존재하는 제목들)와 겹치면
    뒤에 구체적인 정보(키워드, 날짜)를 붙여서 유니크하게 만듭니다.
    """
    
    # 1. 기본 후보: 반장 민원의 핵심 요약
    candidate_title = "복합 민원"
    
    # 반장 선출
    if centroid_vec is not None:
        vectors = np.stack(group['vec'].values)
        dists = cosine_distances([centroid_vec], vectors)[0]
        best_idx = np.argmin(dists)
        leader_row = group.iloc[best_idx]
        
        summary = leader_row.get('core_request', '')
        if summary and 3 < len(summary) < 50:
             candidate_title = summary.replace('\n', ' ').strip()
        else:
            # 반장 요약이 별로면 키워드 조합 시도
            all_kws = []
            for kws in group['kws']: all_kws.extend(list(kws))
            counts = Counter(all_kws)
            # 불용어 리스트 강화
            stop_words = {'민원', '요청', '문의', '신고', '대하여', '관련', '답변', '부탁', '불편', '접수', '사항', '구청', '시장'}
            top_kws = [word for word, count in counts.most_common(10) if word not in stop_words]
            
            if len(top_kws) >= 2: candidate_title = f"{top_kws[0]}, {top_kws[1]} 관련 민원"
            elif len(top_kws) == 1: candidate_title = f"{top_kws[0]} 관련 민원"

    # [중복 검사 및 회피 기동]
    # 만약 이 제목이 이미 존재한다면?
    base_title = candidate_title
    retry_count = 0
    
    while candidate_title in existing_titles:
        retry_count += 1
        
        # 전략 A: 가장 빈도 높은 '장소'나 '명사' 키워드를 뒤에 붙임
        all_kws = []
        for kws in group['kws']: all_kws.extend(list(kws))
        counts = Counter(all_kws)
        # 이미 제목에 포함된 단어는 제외하고 추천
        extras = [w for w, c in counts.most_common(10) if w not in base_title]
        
        if len(extras) >= retry_count:
            # 예: "쓰레기 수거 요청" -> "쓰레기 수거 요청 (고덕동)"
            candidate_title = f"{base_title} ({extras[retry_count-1]})"
        else:
            # 전략 B: 키워드도 다 썼으면 날짜를 붙임
            # 예: "쓰레기 수거 요청 (01/15)"
            date_str = group['received_at'].min().strftime("%m/%d")
            candidate_title = f"{base_title} ({date_str})"
            
            # 전략 C: 날짜도 겹치면 아예 ID를 붙여버림 (최후의 수단)
            if candidate_title in existing_titles:
                 candidate_title = f"{base_title} #{retry_count}"

    return candidate_title

def calculate_hybrid_distance(vec1, vec2, kws1, kws2):
    sem_dist = cosine_distances([vec1], [vec2])[0][0]
    if not kws1 and not kws2: key_dist = 0.5
    elif not kws1 or not kws2: key_dist = 1.0
    else:
        inter = len(kws1.intersection(kws2))
        union = len(kws1.union(kws2))
        key_dist = 1.0 - (inter / union if union else 0)
    return (sem_dist * 0.8) + (key_dist * 0.2)

def run_cumulative_clustering():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    print(f"🚀 [System] 중복 방지 스마트 군집화 시작 ({datetime.now()})")

    # 1. 앵커 로드
    sql_active = """
        SELECT c.incident_id, n.embedding, n.keywords_jsonb, i.title
        FROM complaints c
        JOIN complaint_normalizations n ON c.id = n.complaint_id
        JOIN incidents i ON c.incident_id = i.id
        WHERE c.incident_id IS NOT NULL 
    """
    # incidents 테이블과 조인해서 이미 있는 제목들을 가져옴
    
    active_df = pd.read_sql(sql_active, conn)
    active_df['vec'] = active_df['embedding'].apply(parse_vector)
    active_df['kws'] = active_df['keywords_jsonb'].apply(parse_keywords)
    
    incident_centroids = {}
    
    # [중요] 이미 존재하는 제목들을 기억하는 집합(Set)
    existing_titles = set()
    
    if not active_df.empty:
        # 기존 제목들 등록
        existing_titles.update(active_df['title'].dropna().unique())
        
        for iid, group in active_df.groupby('incident_id'):
            mean_vec = np.mean(np.stack(group['vec'].values), axis=0)
            all_kws = set().union(*group['kws'].tolist())
            incident_centroids[iid] = {'vec': mean_vec, 'kws': all_kws, 'count': len(group)}

    # 2. 미배정 민원 로드
    sql_unassigned = """
        SELECT c.id, c.received_at, n.embedding, n.keywords_jsonb, n.core_request
        FROM complaints c
        JOIN complaint_normalizations n ON c.id = n.complaint_id
        WHERE c.incident_id IS NULL AND n.embedding IS NOT NULL
    """
    target_df = pd.read_sql(sql_unassigned, conn)
    
    if target_df.empty:
        print("🎉 대기 중인 민원이 없습니다."); conn.close(); return

    target_df['vec'] = target_df['embedding'].apply(parse_vector)
    target_df['kws'] = target_df['keywords_jsonb'].apply(parse_keywords)
    print(f"👉 대기/신규 민원 {len(target_df)}건 분류 시작...")

    # 3. 매칭 프로세스
    assigned_count = 0
    unassigned_indices = []
    MATCH_THRESHOLD = 0.06 

    for idx, row in target_df.iterrows():
        best_match = None
        min_dist = 1.0
        for iid, info in incident_centroids.items():
            dist = calculate_hybrid_distance(row['vec'], info['vec'], row['kws'], info['kws'])
            if dist < min_dist:
                min_dist = dist
                best_match = iid
        
        if best_match and min_dist <= MATCH_THRESHOLD:
            cur.execute("UPDATE complaints SET incident_id = %s WHERE id = %s", (best_match, row['id']))
            cur.execute("UPDATE incidents SET complaint_count = complaint_count + 1, last_occurred = %s WHERE id = %s", (row['received_at'], best_match))
            assigned_count += 1
        else:
            unassigned_indices.append(idx)
    conn.commit()

    # 4. 신규 사건 생성
    remaining_df = target_df.loc[unassigned_indices].copy()
    new_inc_count = 0
    
    if not remaining_df.empty and len(remaining_df) >= 2:
        vecs = np.stack(remaining_df['vec'].values)
        kws_list = remaining_df['kws'].tolist()
        n = len(kws_list)
        key_dist = np.ones((n, n))
        for i in range(n):
            for j in range(i, n):
                dist = 0.5 if not kws_list[i] and not kws_list[j] else \
                       1.0 if not kws_list[i] or not kws_list[j] else \
                       1.0 - (len(kws_list[i] & kws_list[j]) / len(kws_list[i] | kws_list[j]))
                key_dist[i, j] = key_dist[j, i] = dist

        sem_dist = cosine_distances(vecs)
        final_dist = (sem_dist * 0.8) + (key_dist * 0.2)
        
        dbscan = DBSCAN(eps=0.06, min_samples=2, metric='precomputed')
        labels = dbscan.fit_predict(final_dist)
        
        remaining_df['label'] = labels
        
        for label in set(labels):
            if label == -1: continue 
            cls = remaining_df[remaining_df['label'] == label]
            
            centroid_vec = np.mean(np.stack(cls['vec'].values), axis=0)
            
            # [중요] 중복 방지 제목 생성 함수 호출
            unique_title = generate_unique_smart_title(cls, centroid_vec, existing_titles)
            
            # 생성된 제목을 Set에 즉시 등록 (이번 루프 내에서 또 안 겹치게)
            existing_titles.add(unique_title)
            
            rep_kw = get_representative_keyword(cls['kws'].tolist())
            kw_json = json.dumps([rep_kw], ensure_ascii=False)
            
            cur.execute("""
                INSERT INTO incidents (title, status, complaint_count, opened_at, closed_at, keywords)
                VALUES (%s, 'OPEN', %s, %s, %s, %s) RETURNING id
            """, (unique_title, len(cls), cls['received_at'].min(), cls['received_at'].max(), kw_json))
            
            new_iid = cur.fetchone()[0]
            ids = tuple(cls['id'].tolist())
            cur.execute(f"UPDATE complaints SET incident_id = %s WHERE id IN %s", (new_iid, ids))
            new_inc_count += 1
            
        conn.commit()

    cur.close(); conn.close()
    print(f"✅ [완료] 기존방 입장: {assigned_count}건 / 새 방 개설: {new_inc_count}개")

if __name__ == "__main__":
    run_cumulative_clustering()