import psycopg2
import pandas as pd
import numpy as np
import json
import ast
import re
from datetime import datetime
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import cosine_similarity
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
    
    stop_words = {
        '항상', '진짜', '너무', '매일', '자꾸', '관리', '민원', '구청', '시장', '사항', '불편', '요청',
        '문의', '신고', '대하여', '관련', '답변', '부탁', '접수', '조치', '확인', '내용', '진행', '바랍니다',
        '주민센터', '직원', '친절', '불친절', '감사' # 너무 흔한 말 제외
    }

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
    
    # 1. 핵심 요청사항(core_request) 요약 시도
    if not group.empty:
        # 가장 긴 core_request를 가진 행을 찾음 (정보량이 많을 확률 높음)
        best_row = group.loc[group['core_request'].str.len().sort_values(ascending=False).index[0]]
        summary = best_row.get('core_request', '')

        if summary and 5 < len(summary) < 40:
             candidate_title = summary.replace('\n', ' ').strip()
        else:
            # 2. 실패시 키워드 조합
            all_kws = []
            for kws in group['kws']: all_kws.extend(list(kws))
            counts = Counter(all_kws)
            if counts:
                top_kws = [w for w, c in counts.most_common(3)]
                if len(top_kws) >= 2:
                    candidate_title = f"{top_kws[0]}, {top_kws[1]} 관련 민원"
                elif top_kws:
                    candidate_title = f"{top_kws[0]} 관련 요청"

    # [중복 검사 및 회피 기동]
    # 만약 이 제목이 이미 존재한다면?
    base_title = candidate_title
    retry_count = 0
    
    while candidate_title in existing_titles:
        retry_count += 1
        candidate_title = f"{base_title} ({retry_count})"
    return candidate_title

def run_cumulative_clustering():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    print(f"🚀 [System] '밸런스 패치' 군집화 시작 (유사도 0.85 / 키워드 완화) ({datetime.now()})")

    # 1. 기존 군집 정보 로드
    sql_active = """
        SELECT c.incident_id, n.embedding, n.keywords_jsonb, i.title,
               (SELECT COUNT(*) FROM complaints WHERE incident_id = c.incident_id) as member_count
        FROM complaints c
        JOIN complaint_normalizations n ON c.id = n.complaint_id
        JOIN incidents i ON c.incident_id = i.id
        WHERE c.incident_id IS NOT NULL
    """
    active_df = pd.read_sql(sql_active, conn)
    active_df['vec'] = active_df['embedding'].apply(parse_vector)
    active_df['kws'] = active_df['keywords_jsonb'].apply(parse_keywords)
    
    incident_centroids = []
    incident_ids = []
    incident_kws = []
    existing_titles = set()
    
    if not active_df.empty:
        existing_titles.update(active_df['title'].unique())
        for iid, group in active_df.groupby('incident_id'):
            # 50개 이상인 방은 더 이상 받지 않음 (쓰레기통 방지)
            if group.iloc[0]['member_count'] >= 50:
                continue

            vectors = np.stack(group['embedding'].apply(parse_vector).values)
            incident_centroids.append(np.mean(vectors, axis=0))
            incident_ids.append(iid)

            # [완화] 교집합 대신, 가장 빈도 높은 키워드 상위 5개를 대표 키워드로 선정
            all_kws = []
            for k in group['keywords_jsonb'].apply(parse_keywords):
                all_kws.extend(list(k))

            common_kws = set([w for w, c in Counter(all_kws).most_common(10)])
            incident_kws.append(common_kws)

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

    print(f"👉 대기 민원 {len(target_df)}건 처리 중...")
    target_df['vec'] = target_df['embedding'].apply(parse_vector)
    target_df['kws'] = target_df['keywords_jsonb'].apply(parse_keywords)
    print(f"👉 대기/신규 민원 {len(target_df)}건 분류 시작...")

    # 3. 매칭 프로세스
    assigned_count = 0
    unassigned_indices = []

    # [설정 완화] 0.85 = "문장은 다르지만 주제는 같음" 수준
    BALANCE_THRESHOLD = 0.85

    # 3. 기존 방 입장 로직
    if incident_centroids:
        target_vecs = np.stack(target_df['vec'].values)
        anchor_vecs = np.stack(incident_centroids)
        sim_matrix = cosine_similarity(target_vecs, anchor_vecs)
        
        for idx in range(len(target_df)):
            row = target_df.iloc[idx]
            best_idx = -1
            max_sim = -1.0

            for a_idx in range(len(incident_ids)):
                # [완화] 키워드가 1개라도 겹치면 OK
                target_k = row['kws']
                anchor_k = incident_kws[a_idx]

                if not (target_k & anchor_k): # 교집합 없으면 패스
                    if len(target_k) > 0 and len(anchor_k) > 0:
                        continue
                    # 키워드 추출이 안 된 경우는 벡터만 믿고 진행

                sim = sim_matrix[idx][a_idx]
                if sim > max_sim:
                    max_sim = sim
                    best_idx = a_idx

            if max_sim >= BALANCE_THRESHOLD:
                best_iid = incident_ids[best_idx]
                cur.execute("UPDATE complaints SET incident_id = %s WHERE id = %s", (int(best_iid), int(row['id'])))
                cur.execute("UPDATE incidents SET closed_at = GREATEST(closed_at, %s) WHERE id = %s", (row['received_at'], int(best_iid)))
                assigned_count += 1
            else:
                unassigned_indices.append(idx)
    else:
        unassigned_indices = list(range(len(target_df)))

    conn.commit()

    # 4. 신규 그룹 형성 (DBSCAN)
    new_group_count = 0
    single_room_count = 0

    if unassigned_indices:
        remaining_df = target_df.iloc[unassigned_indices].copy()

        # [설정 완화] eps=0.12 (약간의 표현 차이 허용), min_samples=2
        if len(remaining_df) >= 2:
            final_vecs = np.stack(remaining_df['vec'].values)
            # eps를 0.12로 늘려서 "비슷하면" 묶이게 함
            dbscan = DBSCAN(eps=0.12, min_samples=2, metric='cosine')
            labels = dbscan.fit_predict(final_vecs)
            remaining_df['label'] = labels
        else:
            remaining_df['label'] = -1

        for label in set(remaining_df['label']):
            if label != -1:
                cls = remaining_df[remaining_df['label'] == label]

                # 키워드 검사도 완화 (교집합 없어도 벡터가 매우 가까우면 허용)
                # 다만, 완전히 엉뚱한게 묶이는걸 방지하기 위해
                # 벡터들의 평균 거리가 너무 멀면 찢는 로직은 생략 (eps가 제어함)

                centroid = np.mean(np.stack(cls['vec'].values), axis=0)
                title = generate_unique_smart_title(cls, centroid, existing_titles)
                existing_titles.add(title)

                cur.execute("INSERT INTO incidents (title, status, opened_at, closed_at) VALUES (%s, 'OPEN', %s, %s) RETURNING id",
                           (title, cls['received_at'].min(), cls['received_at'].max()))
                new_iid = cur.fetchone()[0]
                cur.execute(f"UPDATE complaints SET incident_id = %s WHERE id IN %s", (new_iid, tuple(cls['id'].tolist())))
                new_group_count += 1

            else:
                # 1인실 (화면에는 안 띄울 예정)
                noises = remaining_df[remaining_df['label'] == -1]
                for _, row in noises.iterrows():
                    temp_df = pd.DataFrame([row])
                    title = generate_unique_smart_title(temp_df, None, existing_titles)
                    existing_titles.add(title)

                    cur.execute("INSERT INTO incidents (title, status, opened_at, closed_at) VALUES (%s, 'OPEN', %s, %s) RETURNING id",
                               (title, row['received_at'], row['received_at']))
                    new_iid = cur.fetchone()[0]
                    cur.execute("UPDATE complaints SET incident_id = %s WHERE id = %s", (new_iid, int(row['id'])))
                    single_room_count += 1

    conn.commit()
    cur.close(); conn.close()

    print(f"✅ 결과 요약:")
    print(f"  - 기존 방 흡수: {assigned_count}건")
    print(f"  - 신규 그룹 생성: {new_group_count}개 (여기에 주목하세요!)")
    print(f"  - 1인 대기방: {single_room_count}개 (화면 필터링 필요)")

if __name__ == "__main__":
    run_cumulative_clustering()